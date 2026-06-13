#!/usr/bin/env python3
"""个股估值分析桥接脚本（PE 历史分位 / 股息率 / ROE / 击球区）。

数据源由 `a-stock-data` Skill 决定（见 .cursor/skills/a-stock-data/SKILL.md）：
- 现价 / 实时 PE：腾讯财经（HTTP, 不封 IP）
- 历史收盘：mootdx 通达信日线（TCP, 分页取 ~10 年）
- 历史 EPS / ROE：东财 F10 主要财务指标（HTTP）
- 分红：东财数据中心 RPT_SHAREBONUS_DET（HTTP, 内置节流）

PE 历史分位算法：用东财季度 EPS(累计) 还原单季 → 滚动 TTM EPS（按披露截止日生效）→
对每个交易日 PE = 收盘 / TTM_EPS，再求当前 PE 在历史序列中的百分位。

用法：python scripts/stock_valuation.py 600519
输出：单行 JSON。各分项独立 try/except，部分失败仍返回其余字段。
"""
import bisect
import datetime as dt
import json
import sys
import urllib.request
import warnings

warnings.filterwarnings("ignore")

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"


def market_prefix(code: str) -> str:
    if code.startswith(("6", "9")):
        return "sh"
    if code.startswith("8"):
        return "bj"
    return "sz"


# ── 现价 / 实时 PE（腾讯） ─────────────────────────────────────────────
def fetch_price_pe(code: str) -> dict:
    url = f"https://qt.gtimg.cn/q={market_prefix(code)}{code}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        vals = resp.read().decode("gbk").split('"')[1].split("~")

    def f(i):
        try:
            return float(vals[i]) if vals[i] else 0.0
        except (IndexError, ValueError):
            return 0.0

    return {"name": vals[1], "price": f(3), "peLive": f(39)}


# ── 所属行业（东财 push2 个股基本面） ─────────────────────────────────
def fetch_industry(code: str) -> str:
    market = 1 if market_prefix(code) == "sh" else 0
    qs = (
        "fltt=2&invt=2&fields=f57,f58,f127"
        f"&secid={market}.{code}"
    )
    url = f"https://push2.eastmoney.com/api/qt/stock/get?{qs}"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=10) as resp:
        j = json.loads(resp.read().decode("utf-8"))
    return (j.get("data") or {}).get("f127") or ""


# ── 历史收盘（mootdx 日线，分页） ──────────────────────────────────────
def fetch_daily_closes(code: str, pages: int = 3) -> list[tuple[dt.date, float]]:
    from mootdx.quotes import Quotes

    client = Quotes.factory(market="std")
    out: dict[dt.date, float] = {}
    for p in range(pages):
        df = client.bars(symbol=code, frequency=9, offset=800, start=p * 800)
        if df is None or len(df) == 0:
            break
        for _, row in df.iterrows():
            d = str(row["datetime"])[:10]
            try:
                out[dt.date.fromisoformat(d)] = float(row["close"])
            except (ValueError, TypeError):
                continue
        if len(df) < 800:
            break
    return sorted(out.items())


# ── 历史 EPS / ROE（东财 F10 主要指标） ───────────────────────────────
def fetch_f10_indicators(code: str, page_size: int = 60) -> list[dict]:
    secucode = f"{code}.{'SH' if market_prefix(code) == 'sh' else ('BJ' if market_prefix(code) == 'bj' else 'SZ')}"
    qs = (
        "reportName=RPT_F10_FINANCE_MAINFINADATA"
        "&columns=SECUCODE,REPORT_DATE,EPSJB,ROEJQ"
        f"&filter=(SECUCODE=%22{secucode}%22)"
        f"&pageSize={page_size}&pageNumber=1"
        "&sortColumns=REPORT_DATE&sortTypes=-1&source=HSF10&client=PC"
    )
    url = f"https://datacenter.eastmoney.com/securities/api/data/v1/get?{qs}"
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": "https://emweb.securities.eastmoney.com/"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        j = json.loads(resp.read().decode("utf-8"))
    return (j.get("result") or {}).get("data") or []


def _disclosure_date(period: dt.date) -> dt.date:
    """报告期 → 法定披露截止日（近似），避免历史 PE 前视偏差。"""
    if period.month == 3:
        return dt.date(period.year, 4, 30)
    if period.month == 6:
        return dt.date(period.year, 8, 31)
    if period.month == 9:
        return dt.date(period.year, 10, 31)
    return dt.date(period.year + 1, 4, 30)  # 年报


def build_ttm_eps_series(rows: list[dict]):
    """返回 (生效日升序列表, 对应 TTM EPS 列表) 与最新 TTM EPS。"""
    cum: dict[dt.date, float] = {}
    for r in rows:
        rd = str(r.get("REPORT_DATE", ""))[:10]
        eps = r.get("EPSJB")
        if not rd or eps is None:
            continue
        try:
            cum[dt.date.fromisoformat(rd)] = float(eps)
        except (ValueError, TypeError):
            continue

    periods = sorted(cum)
    single: dict[dt.date, float] = {}
    for p in periods:
        if p.month == 3:
            single[p] = cum[p]
        else:
            prev_map = {6: dt.date(p.year, 3, 31), 9: dt.date(p.year, 6, 30), 12: dt.date(p.year, 9, 30)}
            prev = prev_map.get(p.month)
            if prev in cum:
                single[p] = cum[p] - cum[prev]
            else:
                single[p] = None  # 缺口，无法还原单季

    eff_dates: list[dt.date] = []
    ttm_vals: list[float] = []
    sp = sorted(single)
    for i, p in enumerate(sp):
        if i < 3:
            continue
        window = [single[sp[j]] for j in range(i - 3, i + 1)]
        if any(v is None for v in window):
            continue
        ttm = sum(window)
        if ttm <= 0:
            continue
        eff_dates.append(_disclosure_date(p))
        ttm_vals.append(ttm)

    latest_ttm = ttm_vals[-1] if ttm_vals else None
    return eff_dates, ttm_vals, latest_ttm


def latest_annual_roe(rows: list[dict]):
    for r in rows:
        rd = str(r.get("REPORT_DATE", ""))[:10]
        if rd.endswith("12-31") and r.get("ROEJQ") is not None:
            try:
                return float(r["ROEJQ"]), rd[:4]
            except (ValueError, TypeError):
                continue
    return None, None


def compute_pe_percentile(closes, eff_dates, ttm_vals, price, latest_ttm):
    if not eff_dates or not closes:
        return None, None, None
    pe_hist = []
    for d, close in closes:
        idx = bisect.bisect_right(eff_dates, d) - 1
        if idx < 0:
            continue
        ttm = ttm_vals[idx]
        if ttm > 0:
            pe_hist.append(close / ttm)
    if len(pe_hist) < 30:
        return None, None, None
    pe_now = price / latest_ttm if latest_ttm else pe_hist[-1]
    below = sum(1 for v in pe_hist if v <= pe_now)
    percentile = round(100 * below / len(pe_hist), 1)
    window_years = round((closes[-1][0] - closes[0][0]).days / 365.0, 1)
    return percentile, round(pe_now, 2), window_years


# ── 股息率（东财分红，滚动 12 个月） ──────────────────────────────────
def fetch_dividend_yield(code: str, price: float):
    qs = (
        "reportName=RPT_SHAREBONUS_DET&columns=ALL"
        f"&filter=(SECURITY_CODE=%22{code}%22)"
        "&pageNumber=1&pageSize=50&sortColumns=EX_DIVIDEND_DATE&sortTypes=-1&source=WEB&client=WEB"
    )
    url = f"https://datacenter-web.eastmoney.com/api/data/v1/get?{qs}"
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": "https://data.eastmoney.com/"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        j = json.loads(resp.read().decode("utf-8"))
    rows = (j.get("result") or {}).get("data") or []
    cutoff = dt.date.today() - dt.timedelta(days=365)
    per_10 = 0.0
    for r in rows:
        ed = str(r.get("EX_DIVIDEND_DATE", ""))[:10]
        amt = r.get("PRETAX_BONUS_RMB")
        if not ed or amt is None:
            continue
        try:
            if dt.date.fromisoformat(ed) >= cutoff:
                per_10 += float(amt)
        except (ValueError, TypeError):
            continue
    if price <= 0:
        return None
    return round(per_10 / 10.0 / price * 100, 2)


def strike_zone(percentile):
    if percentile is None:
        return "unknown"
    if percentile <= 20:
        return "undervalued"
    if percentile >= 80:
        return "overvalued"
    return "fair"


def main() -> int:
    if len(sys.argv) < 2 or not sys.argv[1].strip().isdigit() or len(sys.argv[1].strip()) != 6:
        print(json.dumps({"success": False, "error": "股票代码须为 6 位数字"}, ensure_ascii=False))
        return 2
    code = sys.argv[1].strip()
    result: dict = {"success": True, "code": code}

    try:
        base = fetch_price_pe(code)
        result.update(name=base["name"], price=base["price"], peLive=base["peLive"])
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"success": False, "error": f"取现价失败：{exc}"}, ensure_ascii=False))
        return 1

    price = result.get("price", 0.0)

    try:
        result["industry"] = fetch_industry(code)
    except Exception:  # noqa: BLE001
        result["industry"] = ""

    # ROE + PE 历史分位（共用 F10 指标）
    try:
        rows = fetch_f10_indicators(code)
        roe, roe_period = latest_annual_roe(rows)
        result["roe"] = roe
        result["roePeriod"] = roe_period
        eff_dates, ttm_vals, latest_ttm = build_ttm_eps_series(rows)
        closes = fetch_daily_closes(code)
        pct, pe_now, win = compute_pe_percentile(closes, eff_dates, ttm_vals, price, latest_ttm)
        result["pePercentile"] = pct
        result["peComputed"] = pe_now
        result["peWindowYears"] = win
    except Exception as exc:  # noqa: BLE001
        result["valuationError"] = str(exc)

    # 股息率
    try:
        result["dividendYield"] = fetch_dividend_yield(code, price)
    except Exception as exc:  # noqa: BLE001
        result["dividendError"] = str(exc)

    result["strikeZone"] = strike_zone(result.get("pePercentile"))
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
