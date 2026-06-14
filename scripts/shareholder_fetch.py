#!/usr/bin/env python3
"""股东回报「原料」取数脚本（对应 docs/RRD_1.md §6 股东回报）。

职责：拉取客观数据，支撑「分红/回购 与 市值/收入 的关系」分析：
  - 历年现金分红总额（按分红所属年度聚合，亿元）
  - 历年归母净利润 / 营业总收入（亿元）——用于算分红率、分红/收入
  - 当前总市值（亿元）——用于算股息率、累计分红/市值
  - 连续现金分红年数、累计现金分红

数据源：东财 datacenter 分红明细 RPT_SHAREBONUS_DET + F10 主要指标 + push2 个股基本面。

回购：东财无统一的 datacenter 回购报表，本脚本不含回购金额序列；
回购情况由上层（Cursor / AI）定性补充。

用法：python scripts/shareholder_fetch.py 600519
输出：单段 JSON（缩进）。
"""
import json
import sys
import urllib.request
import warnings
from collections import defaultdict

warnings.filterwarnings("ignore")

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"


def market_suffix(code: str) -> str:
    if code.startswith(("6", "9")):
        return "SH"
    if code.startswith("8"):
        return "BJ"
    return "SZ"


def _get_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": "https://data.eastmoney.com/"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_dividends(code: str) -> dict[str, float]:
    """按「分红所属年度」聚合现金分红总额（亿元）。"""
    qs = (
        "reportName=RPT_SHAREBONUS_DET"
        "&columns=SECURITY_CODE,REPORT_DATE,EX_DIVIDEND_DATE,PRETAX_BONUS_RMB,TOTAL_SHARES,ASSIGN_PROGRESS"
        f"&filter=(SECURITY_CODE=%22{code}%22)"
        "&pageNumber=1&pageSize=200&sortColumns=REPORT_DATE&sortTypes=-1&source=WEB&client=WEB"
    )
    j = _get_json(f"https://datacenter-web.eastmoney.com/api/data/v1/get?{qs}")
    rows = (j.get("result") or {}).get("data") or []
    by_year: dict[str, float] = defaultdict(float)
    seen = set()
    for r in rows:
        per10 = r.get("PRETAX_BONUS_RMB")
        shares = r.get("TOTAL_SHARES")
        rd = str(r.get("REPORT_DATE", ""))[:4]
        key = (rd, str(r.get("EX_DIVIDEND_DATE")), per10)
        if not per10 or not shares or not rd or key in seen:
            continue
        seen.add(key)
        try:
            by_year[rd] += float(per10) / 10.0 * float(shares) / 1e8
        except (TypeError, ValueError):
            continue
    return {y: round(v, 2) for y, v in by_year.items()}


def fetch_fin(code: str) -> dict[str, dict]:
    """按年度取归母净利 / 营业总收入（亿元）。"""
    secucode = f"{code}.{market_suffix(code)}"
    qs = (
        "reportName=RPT_F10_FINANCE_MAINFINADATA"
        "&columns=REPORT_DATE,TOTALOPERATEREVE,PARENTNETPROFIT"
        f"&filter=(SECUCODE=%22{secucode}%22)"
        "&pageSize=80&pageNumber=1&sortColumns=REPORT_DATE&sortTypes=-1&source=HSF10&client=PC"
    )
    j = _get_json(f"https://datacenter.eastmoney.com/securities/api/data/v1/get?{qs}")
    rows = (j.get("result") or {}).get("data") or []
    out: dict[str, dict] = {}
    for r in rows:
        rd = str(r.get("REPORT_DATE", ""))[:10]
        if not rd.endswith("12-31"):
            continue
        try:
            out[rd[:4]] = {
                "revenue": round(float(r["TOTALOPERATEREVE"]) / 1e8, 2) if r.get("TOTALOPERATEREVE") else None,
                "netProfit": round(float(r["PARENTNETPROFIT"]) / 1e8, 2) if r.get("PARENTNETPROFIT") else None,
            }
        except (TypeError, ValueError):
            continue
    return out


def fetch_mcap(code: str) -> tuple[str, float]:
    market = 1 if market_suffix(code) == "SH" else 0
    qs = f"fltt=2&invt=2&fields=f57,f58,f116&secid={market}.{code}"
    j = _get_json(f"https://push2.eastmoney.com/api/qt/stock/get?{qs}")
    d = j.get("data") or {}
    mcap = d.get("f116")
    return d.get("f58") or "", round(float(mcap) / 1e8, 2) if mcap else 0.0


def main() -> int:
    if len(sys.argv) < 2 or not sys.argv[1].strip().isdigit() or len(sys.argv[1].strip()) != 6:
        print(json.dumps({"success": False, "error": "股票代码须为 6 位数字"}, ensure_ascii=False))
        return 2
    code = sys.argv[1].strip()
    out: dict = {"success": True, "code": code}
    try:
        name, mcap = fetch_mcap(code)
        out["name"] = name
        out["mcapYi"] = mcap
    except Exception as e:  # noqa: BLE001
        out["mcap_error"] = str(e)

    divs = {}
    try:
        divs = fetch_dividends(code)
    except Exception as e:  # noqa: BLE001
        out["dividend_error"] = str(e)

    fin = {}
    try:
        fin = fetch_fin(code)
    except Exception as e:  # noqa: BLE001
        out["fin_error"] = str(e)

    years = sorted(set(divs) | set(fin))
    annual = []
    for y in years:
        if y < "2014":
            continue
        d = divs.get(y)
        f = fin.get(y, {})
        np_ = f.get("netProfit")
        payout = round(d / np_ * 100, 1) if (d and np_ and np_ > 0) else None
        annual.append({
            "year": y,
            "dividend": d if d else (0.0 if y in fin else None),
            "netProfit": np_,
            "revenue": f.get("revenue"),
            "payoutRatio": payout,
        })
    out["annual"] = annual

    # 连续现金分红年数（从最近完整年度往前数）
    consec = 0
    for row in reversed(annual):
        if row["dividend"] and row["dividend"] > 0:
            consec += 1
        elif row["year"] == annual[-1]["year"] and (row["dividend"] in (None, 0.0)):
            continue  # 最新年度可能尚未实施，跳过不打断
        else:
            break
    out["consecutiveYears"] = consec
    out["cumulativeDividend"] = round(sum(v for v in divs.values()), 2)
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
