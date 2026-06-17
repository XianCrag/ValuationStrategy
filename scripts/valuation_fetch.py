#!/usr/bin/env python3
"""估值总结「原料」取数脚本（对应 docs/RRD_1.md §10 估值总结）。

为三种估值方法提供客观锚点（不做估值结论，结论由上层 Cursor / AI 综合）：
  - ① 股息率估值：每股股息（DPS）、滚动 12 个月股息率、历年分红
  - ② DCF：历年经营现金流净额 / 自由现金流（FCFF）/ 每股经营现金流、总股本
  - ③ 未来盈利能力：历年每股收益 EPS、归母净利、营收（判断常态盈利）
  - 现价 / 实时 PE（腾讯），用于信号灯与倍数参考

数据源：
  - 腾讯财经：现价 / 实时 PE（不封 IP）
  - 东财 F10 主要财务指标 RPT_F10_FINANCE_MAINFINADATA：EPS / 每股经营现金流 /
    经营现金流净额(NETCASH_OPERATE_PK) / 自由现金流(FCFF_BACK) / 归母净利 / 营收
  - 东财数据中心 RPT_SHAREBONUS_DET：历年现金分红（按分红所属年度聚合）

用法：python scripts/valuation_fetch.py 601088
输出：单段 JSON（缩进）。各分项独立 try/except，部分失败仍返回其余字段。
"""
import datetime as dt
import json
import sys
import urllib.request
import warnings
from collections import defaultdict

warnings.filterwarnings("ignore")

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"


def market_prefix(code: str) -> str:
    if code.startswith(("6", "9")):
        return "sh"
    if code.startswith("8"):
        return "bj"
    return "sz"


def market_suffix(code: str) -> str:
    return {"sh": "SH", "bj": "BJ", "sz": "SZ"}[market_prefix(code)]


def _get_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": "https://emweb.securities.eastmoney.com/"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _yi(v):
    try:
        return round(float(v) / 1e8, 2)
    except (TypeError, ValueError):
        return None


def _num(v, digits=2):
    try:
        return round(float(v), digits)
    except (TypeError, ValueError):
        return None


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


# ── 历年财务/现金流序列（东财 F10 主要指标） ──────────────────────────
def fetch_annual(code: str, years: int = 12):
    secucode = f"{code}.{market_suffix(code)}"
    cols = ",".join([
        "REPORT_DATE", "EPSJB", "MGJYXJJE", "NETCASH_OPERATE_PK", "FCFF_BACK",
        "PARENTNETPROFIT", "TOTALOPERATEREVE", "ROEJQ",
    ])
    qs = (
        f"reportName=RPT_F10_FINANCE_MAINFINADATA&columns={cols}"
        f"&filter=(SECUCODE=%22{secucode}%22)"
        f"&pageSize=80&pageNumber=1&sortColumns=REPORT_DATE&sortTypes=-1&source=HSF10&client=PC"
    )
    rows = (_get_json(f"https://datacenter.eastmoney.com/securities/api/data/v1/get?{qs}").get("result") or {}).get("data") or []
    annual = []
    shares_yi = None
    for r in rows:
        rd = str(r.get("REPORT_DATE", ""))[:10]
        if not rd.endswith("12-31"):
            continue
        eps = _num(r.get("EPSJB"))
        mgocf = _num(r.get("MGJYXJJE"))
        ocf_yi = _yi(r.get("NETCASH_OPERATE_PK"))
        # 由「经营现金流净额 / 每股经营现金流」反推总股本（亿股），取最近可得
        if shares_yi is None and ocf_yi and mgocf:
            shares_yi = round(ocf_yi / mgocf, 2)
        annual.append({
            "year": rd[:4],
            "eps": eps,
            "ocfPerShare": mgocf,
            "ocfYi": ocf_yi,
            "fcfYi": _yi(r.get("FCFF_BACK")),
            "netProfitYi": _yi(r.get("PARENTNETPROFIT")),
            "revenueYi": _yi(r.get("TOTALOPERATEREVE")),
            "roe": _num(r.get("ROEJQ")),
        })
    annual.sort(key=lambda x: x["year"])
    return annual[-years:], shares_yi


# ── 历年现金分红（东财数据中心，按分红所属年度聚合，亿元） ────────────
def fetch_dividends(code: str) -> dict:
    qs = (
        "reportName=RPT_SHAREBONUS_DET"
        "&columns=SECURITY_CODE,REPORT_DATE,EX_DIVIDEND_DATE,PRETAX_BONUS_RMB,TOTAL_SHARES"
        f"&filter=(SECURITY_CODE=%22{code}%22)"
        "&pageNumber=1&pageSize=200&sortColumns=REPORT_DATE&sortTypes=-1&source=WEB&client=WEB"
    )
    rows = (_get_json(f"https://datacenter-web.eastmoney.com/api/data/v1/get?{qs}").get("result") or {}).get("data") or []
    by_year = defaultdict(float)
    ttm_per10 = 0.0
    cutoff = dt.date.today() - dt.timedelta(days=365)
    seen = set()
    for r in rows:
        per10 = r.get("PRETAX_BONUS_RMB")
        shares = r.get("TOTAL_SHARES")
        rd = str(r.get("REPORT_DATE", ""))[:4]
        ed = str(r.get("EX_DIVIDEND_DATE", ""))[:10]
        key = (rd, ed, per10)
        if not per10 or key in seen:
            continue
        seen.add(key)
        try:
            if shares and rd:
                by_year[rd] += float(per10) / 10.0 * float(shares) / 1e8
            if ed and dt.date.fromisoformat(ed) >= cutoff:
                ttm_per10 += float(per10)
        except (TypeError, ValueError):
            continue
    return {
        "perYear": {y: round(v, 2) for y, v in by_year.items()},
        "ttmDps": round(ttm_per10 / 10.0, 4) if ttm_per10 else 0.0,  # 滚动12个月每股股息（元）
    }


def main() -> int:
    if len(sys.argv) < 2 or not sys.argv[1].strip().isdigit() or len(sys.argv[1].strip()) != 6:
        print(json.dumps({"success": False, "error": "股票代码须为 6 位数字"}, ensure_ascii=False))
        return 2
    code = sys.argv[1].strip()
    out: dict = {"success": True, "code": code}

    try:
        base = fetch_price_pe(code)
        out.update(name=base["name"], price=base["price"], peLive=base["peLive"])
    except Exception as e:  # noqa: BLE001
        out["price_error"] = str(e)

    try:
        annual, shares_yi = fetch_annual(code)
        out["annual"] = annual
        out["sharesYi"] = shares_yi
    except Exception as e:  # noqa: BLE001
        out["annual_error"] = str(e)
        out["annual"] = []
        out["sharesYi"] = None

    try:
        divs = fetch_dividends(code)
        out["dividendPerYear"] = divs["perYear"]
        out["ttmDps"] = divs["ttmDps"]
        price = out.get("price") or 0.0
        out["ttmDividendYield"] = round(divs["ttmDps"] / price * 100, 2) if price else None
    except Exception as e:  # noqa: BLE001
        out["dividend_error"] = str(e)

    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
