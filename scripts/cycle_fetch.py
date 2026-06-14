#!/usr/bin/env python3
"""周期分析「原料」取数脚本（对应 docs/RRD_1.md §4 周期性）。

职责：拉取近 ~10 年**年报**财务序列（客观数据），供上层判断周期性与周期位置：
  - 营业总收入 / 归母净利润（绝对值，亿元）
  - 营收同比 / 归母净利同比（%）
  - 加权 ROE / 销售毛利率 / 销售净利率（%）

数据源：东财 F10 主要财务指标 RPT_F10_FINANCE_MAINFINADATA（与 stock_valuation.py 同源）。

不做定性归纳：是否周期股 / 当前周期位置 这类 🟨 AI 判断留给上层
（开发期由 Cursor 综合后写入 data/cycle/{code}.json）。

用法：
    python scripts/cycle_fetch.py 601088
输出：单段 JSON（缩进）。
"""
import json
import sys
import urllib.request
import warnings

warnings.filterwarnings("ignore")

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"


def market_suffix(code: str) -> str:
    if code.startswith(("6", "9")):
        return "SH"
    if code.startswith("8"):
        return "BJ"
    return "SZ"


def _yi(v):
    """元 → 亿元，保留 2 位。"""
    try:
        return round(float(v) / 1e8, 2)
    except (TypeError, ValueError):
        return None


def _pct(v):
    try:
        return round(float(v), 2)
    except (TypeError, ValueError):
        return None


def fetch_annual(code: str, years: int = 12) -> tuple[str, list[dict]]:
    secucode = f"{code}.{market_suffix(code)}"
    cols = ",".join([
        "SECURITY_NAME_ABBR", "REPORT_DATE", "TOTALOPERATEREVE", "PARENTNETPROFIT",
        "TOTALOPERATEREVETZ", "PARENTNETPROFITTZ", "ROEJQ", "XSMLL", "XSJLL",
    ])
    qs = (
        f"reportName=RPT_F10_FINANCE_MAINFINADATA&columns={cols}"
        f"&filter=(SECUCODE=%22{secucode}%22)"
        f"&pageSize=80&pageNumber=1&sortColumns=REPORT_DATE&sortTypes=-1&source=HSF10&client=PC"
    )
    url = f"https://datacenter.eastmoney.com/securities/api/data/v1/get?{qs}"
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": "https://emweb.securities.eastmoney.com/"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        j = json.loads(resp.read().decode("utf-8"))
    rows = (j.get("result") or {}).get("data") or []

    name = ""
    annual = []
    for r in rows:
        rd = str(r.get("REPORT_DATE", ""))[:10]
        if not rd.endswith("12-31"):
            continue
        name = name or (r.get("SECURITY_NAME_ABBR") or "")
        annual.append({
            "year": rd[:4],
            "revenue": _yi(r.get("TOTALOPERATEREVE")),
            "netProfit": _yi(r.get("PARENTNETPROFIT")),
            "revenueYoY": _pct(r.get("TOTALOPERATEREVETZ")),
            "netProfitYoY": _pct(r.get("PARENTNETPROFITTZ")),
            "roe": _pct(r.get("ROEJQ")),
            "grossMargin": _pct(r.get("XSMLL")),
            "netMargin": _pct(r.get("XSJLL")),
        })
    annual.sort(key=lambda x: x["year"])
    return name, annual[-years:]


def main() -> int:
    if len(sys.argv) < 2 or not sys.argv[1].strip().isdigit() or len(sys.argv[1].strip()) != 6:
        print(json.dumps({"success": False, "error": "股票代码须为 6 位数字"}, ensure_ascii=False))
        return 2
    code = sys.argv[1].strip()
    try:
        name, annual = fetch_annual(code)
        print(json.dumps({"success": True, "code": code, "name": name, "annual": annual},
                         ensure_ascii=False, indent=2))
        return 0
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"success": False, "error": str(exc)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
