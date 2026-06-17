#!/usr/bin/env python3
"""EV/EBIT 交叉验证「原料」取数脚本（用于 ② DCF 估值的横向校验）。

DCF 对增长 / 折现率高度敏感，结论难以证伪；EV/EBIT 资本结构中性、对周期性重
资产矿企比 PE 更可比，可作为 DCF 合理价值的横向「体检」：把 DCF 每股合理价值反
推为隐含 EV/EBIT，与当前倍数、行业合理倍数区间对照，判断 DCF 是否偏乐观 / 偏保守。

口径：
  - EV   = 总市值 + 净负债 + 少数股东权益（EBIT 为合并口径，需加回少数股东权益）
  - 净负债 = 有息负债(短借+一年内到期非流动+长借+应付债券+租赁负债) − 现金(货币资金+交易性金融资产)
  - EBIT = 利润总额 + 利息费用（FE_INTEREST_EXPENSE），提供 TTM 与最近年报两口径

数据源：
  - 腾讯财经 qt.gtimg.cn：现价 / 总市值（不封 IP）
  - 东财 F10 RPT_F10_FINANCE_GINCOME（利润表）/ RPT_F10_FINANCE_GBALANCE（资产负债表）

用法：python scripts/ev_ebit_fetch.py 601600
输出：单段 JSON（缩进）。各分项独立 try/except，部分失败仍返回其余字段。
"""
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
    """元 → 亿元（保留 2 位）。"""
    try:
        return round(float(v) / 1e8, 2)
    except (TypeError, ValueError):
        return None


def fetch_mcap(code: str) -> dict:
    url = f"https://qt.gtimg.cn/q={market_prefix(code)}{code}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        vals = resp.read().decode("gbk").split('"')[1].split("~")
    return {"name": vals[1], "price": _f(vals[3]), "mcapYi": _f(vals[45])}  # vals[45]=总市值(亿)


def _statement(rpt: str, secu: str, page_size: int = 12) -> list:
    qs = (
        f"reportName={rpt}&columns=ALL&filter=(SECUCODE=%22{secu}%22)"
        f"&pageSize={page_size}&pageNumber=1&sortColumns=REPORT_DATE&sortTypes=-1&source=HSF10&client=PC"
    )
    return (_get_json(f"https://datacenter.eastmoney.com/securities/api/data/v1/get?{qs}").get("result") or {}).get("data") or []


def fetch_ebit(secu: str) -> dict:
    """返回 TTM EBIT 与最近年报 EBIT（亿元）。EBIT=利润总额+利息费用。"""
    rows = _statement("RPT_F10_FINANCE_GINCOME", secu)
    by_date = {}
    for r in rows:
        d = str(r.get("REPORT_DATE", ""))[:10]
        if not d:
            continue
        ebit = _f(r.get("TOTAL_PROFIT")) + _f(r.get("FE_INTEREST_EXPENSE"))
        by_date[d] = ebit
    dates = sorted(by_date, reverse=True)
    if not dates:
        return {"ebitTtmYi": None, "ebitAnnualYi": None, "ebitBasis": None, "ttmPeriod": None, "annualPeriod": None}

    latest = dates[0]
    # 最近年报
    annual_dates = [d for d in dates if d.endswith("12-31")]
    annual = annual_dates[0] if annual_dates else None
    ebit_annual = by_date.get(annual) if annual else None

    # TTM：最新累计 + 上年全年 − 上年同期累计
    if latest.endswith("12-31"):
        ebit_ttm = by_date[latest]
        ttm_basis = f"{latest[:4]} 年报 利润总额+利息费用"
        ttm_period = latest[:4] + " 年报"
    else:
        ly_annual = f"{int(latest[:4]) - 1}-12-31"
        ly_same = f"{int(latest[:4]) - 1}{latest[4:]}"
        if ly_annual in by_date and ly_same in by_date:
            ebit_ttm = by_date[latest] + by_date[ly_annual] - by_date[ly_same]
            ttm_basis = f"TTM(截至 {latest}) 利润总额+利息费用"
            ttm_period = "TTM " + latest
        else:
            ebit_ttm = by_date.get(annual) if annual else None
            ttm_basis = f"{annual[:4] if annual else ''} 年报 利润总额+利息费用（TTM 不可得回退年报）"
            ttm_period = (annual[:4] + " 年报") if annual else None

    return {
        "ebitTtmYi": _yi(ebit_ttm) if ebit_ttm is not None else None,
        "ebitAnnualYi": _yi(ebit_annual) if ebit_annual is not None else None,
        "ebitBasis": ttm_basis,
        "ttmPeriod": ttm_period,
        "annualPeriod": (annual[:4] + " 年报") if annual else None,
    }


def fetch_net_debt(secu: str) -> dict:
    """返回净负债 / 有息负债 / 现金 / 少数股东权益（亿元）。"""
    rows = _statement("RPT_F10_FINANCE_GBALANCE", secu, page_size=2)
    if not rows:
        return {}
    r = rows[0]
    debt = (
        _f(r.get("SHORT_LOAN")) + _f(r.get("NONCURRENT_LIAB_1YEAR")) + _f(r.get("LONG_LOAN"))
        + _f(r.get("BOND_PAYABLE")) + _f(r.get("LEASE_LIAB"))
    )
    cash = _f(r.get("MONETARYFUNDS")) + _f(r.get("TRADE_FINASSET_NOTFVTPL"))
    minority = _f(r.get("MINORITY_EQUITY"))
    return {
        "period": str(r.get("REPORT_DATE", ""))[:10],
        "debtYi": _yi(debt),
        "cashYi": _yi(cash),
        "netDebtYi": _yi(debt - cash),
        "minorityYi": _yi(minority),
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
        out.update(name=m["name"], price=m["price"], mcapYi=m["mcapYi"])
    except Exception as e:  # noqa: BLE001
        out["mcap_error"] = str(e)

    try:
        out.update(fetch_ebit(secu))
    except Exception as e:  # noqa: BLE001
        out["ebit_error"] = str(e)

    try:
        out["balance"] = fetch_net_debt(secu)
    except Exception as e:  # noqa: BLE001
        out["balance_error"] = str(e)

    # 当前 EV / EBIT
    try:
        mcap = out.get("mcapYi") or 0.0
        nd = (out.get("balance") or {}).get("netDebtYi") or 0.0
        mino = (out.get("balance") or {}).get("minorityYi") or 0.0
        ev = round(mcap + nd + mino, 2)
        out["evYi"] = ev
        for tag, key in (("Ttm", "ebitTtmYi"), ("Annual", "ebitAnnualYi")):
            ebit = out.get(key)
            out[f"evEbit{tag}"] = round(ev / ebit, 2) if ebit and ebit > 0 else None
    except Exception as e:  # noqa: BLE001
        out["ev_error"] = str(e)

    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
