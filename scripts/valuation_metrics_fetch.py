#!/usr/bin/env python3
"""估值「原始财务指标」取数脚本（供前端 100% 公式计算估值，不含任何主观结论）。

只输出客观财务指标，估值由 TS 端按固定公式计算（见
src/app/api/stock-valuation-summary/compute.ts）。本脚本不做任何估值判断。

输出字段：
  - snapshotPrice / sharesYi：现价（腾讯）与总股本（总市值 ÷ 现价）
  - annual[]：历年 {year, revenueYi, netProfitYi, ebitYi, netMargin}（东财利润表，
    EBIT = 利润总额 + 利息费用；netMargin = 归母净利 ÷ 营收 ×100）
  - netDebtYi / minorityYi：净负债（有息负债 − 现金）/ 少数股东权益（东财资产负债表）
  - dpsAvg3y：近 3 个财年平均每股股息（东财分红明细，按所属财年聚合，平滑特别分红）
  - reportPeriod：最近年报报告期

数据源：腾讯财经（现价/总市值，不封 IP）+ 东财 F10 利润表/资产负债表 + 分红明细。
用法：python scripts/valuation_metrics_fetch.py 601600
输出：单段 JSON（缩进）。各分项独立 try/except，部分失败仍返回其余字段。
"""
import datetime as dt
import json
import sys
import urllib.request
import warnings

warnings.filterwarnings("ignore")

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
ANNUAL_YEARS = 8


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


def _f(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def _yi(v):
    try:
        return round(float(v) / 1e8, 2)
    except (TypeError, ValueError):
        return None


def fetch_mcap(code: str) -> dict:
    url = f"https://qt.gtimg.cn/q={market_prefix(code)}{code}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        vals = resp.read().decode("gbk").split('"')[1].split("~")
    price = _f(vals[3])
    mcap = _f(vals[45])  # 总市值（亿）
    shares = round(mcap / price, 2) if price else None
    return {"name": vals[1], "price": price, "sharesYi": shares}


def _statement(rpt: str, secu: str, page_size: int = 40) -> list:
    qs = (
        f"reportName={rpt}&columns=ALL&filter=(SECUCODE=%22{secu}%22)"
        f"&pageSize={page_size}&pageNumber=1&sortColumns=REPORT_DATE&sortTypes=-1&source=HSF10&client=PC"
    )
    return (_get_json(f"https://datacenter.eastmoney.com/securities/api/data/v1/get?{qs}").get("result") or {}).get("data") or []


def fetch_annual(secu: str) -> list:
    """历年年报：revenue / netProfit(归母) / EBIT / netMargin。"""
    rows = _statement("RPT_F10_FINANCE_GINCOME", secu)
    out = []
    for r in rows:
        d = str(r.get("REPORT_DATE", ""))[:10]
        if not d.endswith("12-31"):
            continue
        rev = _f(r.get("TOTAL_OPERATE_INCOME"))
        npft = _f(r.get("PARENT_NETPROFIT"))
        ebit = _f(r.get("TOTAL_PROFIT")) + _f(r.get("FE_INTEREST_EXPENSE"))
        out.append({
            "year": d[:4],
            "revenueYi": _yi(rev),
            "netProfitYi": _yi(npft),
            "ebitYi": _yi(ebit),
            "netMargin": round(npft / rev * 100, 2) if rev else None,
        })
    out.sort(key=lambda x: x["year"])
    return out[-ANNUAL_YEARS:]


def fetch_balance(secu: str) -> dict:
    rows = _statement("RPT_F10_FINANCE_GBALANCE", secu, page_size=2)
    if not rows:
        return {}
    r = rows[0]
    debt = (
        _f(r.get("SHORT_LOAN")) + _f(r.get("NONCURRENT_LIAB_1YEAR")) + _f(r.get("LONG_LOAN"))
        + _f(r.get("BOND_PAYABLE")) + _f(r.get("LEASE_LIAB"))
    )
    cash = _f(r.get("MONETARYFUNDS")) + _f(r.get("TRADE_FINASSET_NOTFVTPL"))
    return {
        "netDebtYi": _yi(debt - cash),
        "minorityYi": _yi(_f(r.get("MINORITY_EQUITY"))),
    }


def fetch_dps_avg(code: str, latest_year, years: int = 3) -> dict:
    """近 N 个财年平均每股股息（DPS）。

    按分红「所属财年」(REPORT_DATE 年份) 聚合每股税前分红，对齐财报年度窗口，
    平滑掉特别分红的单年扰动。窗口 = [Y, Y-1, …, Y-(N-1)]，Y 为最近年报年份；
    缺失年度按 0 计入（真实减/停派会拉低均值），均值 = 窗口内 DPS 之和 ÷ N。
    """
    qs = (
        "reportName=RPT_SHAREBONUS_DET"
        "&columns=SECURITY_CODE,REPORT_DATE,EX_DIVIDEND_DATE,PRETAX_BONUS_RMB"
        f"&filter=(SECURITY_CODE=%22{code}%22)"
        "&pageNumber=1&pageSize=200&sortColumns=REPORT_DATE&sortTypes=-1&source=WEB&client=WEB"
    )
    rows = (_get_json(f"https://datacenter-web.eastmoney.com/api/data/v1/get?{qs}").get("result") or {}).get("data") or []
    per10_by_year: dict[str, float] = {}
    seen = set()
    for r in rows:
        y = str(r.get("REPORT_DATE", ""))[:4]
        ed = str(r.get("EX_DIVIDEND_DATE", ""))[:10]
        amt = r.get("PRETAX_BONUS_RMB")
        key = (y, ed, amt)
        if not y or amt is None or key in seen:
            continue
        seen.add(key)
        try:
            per10_by_year[y] = per10_by_year.get(y, 0.0) + float(amt)
        except (TypeError, ValueError):
            continue
    dps_by_year = {y: round(v / 10.0, 4) for y, v in per10_by_year.items()}
    base = int(latest_year) if latest_year else (max((int(y) for y in dps_by_year), default=dt.date.today().year))
    window = [str(base - i) for i in range(years)]
    avg = round(sum(dps_by_year.get(y, 0.0) for y in window) / years, 4)
    return {
        "dpsAvg3y": avg,
        "dpsByYear": {y: dps_by_year.get(y, 0.0) for y in window},
    }


def main() -> int:
    if len(sys.argv) < 2 or not sys.argv[1].strip().isdigit() or len(sys.argv[1].strip()) != 6:
        print(json.dumps({"success": False, "error": "股票代码须为 6 位数字"}, ensure_ascii=False))
        return 2
    code = sys.argv[1].strip()
    secu = f"{code}.{market_suffix(code)}"
    out: dict = {"success": True, "code": code}

    try:
        m = fetch_mcap(code)
        out.update(name=m["name"], snapshotPrice=m["price"], sharesYi=m["sharesYi"])
    except Exception as e:  # noqa: BLE001
        out["mcap_error"] = str(e)

    try:
        annual = fetch_annual(secu)
        out["annual"] = annual
        out["reportPeriod"] = f"{annual[-1]['year']}-12-31" if annual else None
    except Exception as e:  # noqa: BLE001
        out["annual_error"] = str(e)
        out["annual"] = []

    try:
        out.update(fetch_balance(secu))
    except Exception as e:  # noqa: BLE001
        out["balance_error"] = str(e)

    try:
        latest_year = out["annual"][-1]["year"] if out.get("annual") else None
        out.update(fetch_dps_avg(code, latest_year))
    except Exception as e:  # noqa: BLE001
        out["dps_error"] = str(e)

    out["generatedAt"] = dt.datetime.now().astimezone().isoformat(timespec="seconds")
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
