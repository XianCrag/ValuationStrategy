#!/usr/bin/env python3
"""业务分析「原料」取数脚本（对应 docs/RRD_1.md §2）。

职责：只负责从 `a-stock-data` Skill 拉取**客观原料**——
  - F10 文本（公司概况 / 财务分析 / 行业分析 / 业内点评，mootdx 通达信）
  - 利润表营收 / 净利润近 8 期（新浪三表）
  - 研报标题与评级近 15 篇（东财 reportapi）

不做定性归纳：把业务模式分类 / 收入结构占比 / 单一产品依赖度这类
🟨 AI 判断留给上层（开发期由 Cursor 综合后写入 data/business/{code}.json）。

用法：
    python scripts/business_fetch.py 601088
输出：单段 JSON（缩进），失败的子项以 *_error 键返回，不影响其余字段。
"""
import json
import sys
import warnings

warnings.filterwarnings("ignore")

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"


def market_prefix(code: str) -> str:
    if code.startswith(("6", "9")):
        return "sh"
    if code.startswith("8"):
        return "bj"
    return "sz"


def fetch_f10(code: str) -> dict:
    from mootdx.quotes import Quotes

    client = Quotes.factory(market="std")
    f10 = {}
    for cat in ["公司概况", "财务分析", "行业分析", "业内点评"]:
        try:
            txt = client.F10(symbol=code, name=cat)
            f10[cat] = (txt or "")[:1800]
        except Exception as e:  # noqa: BLE001
            f10[cat] = f"(取失败: {e})"
    return f10


def fetch_revenue(code: str) -> list[dict]:
    import requests

    url = "https://quotes.sina.cn/cn/api/openapi.php/CompanyFinanceService.getFinanceReport2022"
    params = {"paperCode": f"{market_prefix(code)}{code}", "source": "lrb", "type": "0", "page": "1", "num": "8"}
    r = requests.get(url, params=params, headers={"User-Agent": UA}, timeout=15)
    report_list = r.json().get("result", {}).get("data", {}).get("report_list", {}) or {}
    rev = []
    keep = {"营业总收入", "营业收入", "净利润", "归属于母公司所有者的净利润"}
    for period in sorted(report_list.keys(), reverse=True)[:8]:
        obj = report_list[period]
        rec = {"报告期": f"{period[:4]}-{period[4:6]}-{period[6:8]}"}
        for it in obj.get("data", []) or []:
            t = it.get("item_title", "")
            if t in keep:
                rec[t] = it.get("item_value")
                if it.get("item_tongbi") not in (None, ""):
                    rec[t + "_同比"] = it.get("item_tongbi")
        rev.append(rec)
    return rev


def fetch_reports(code: str, limit: int = 15) -> list[dict]:
    import requests

    url = "https://reportapi.eastmoney.com/report/list"
    params = {
        "industryCode": "*", "pageSize": "30", "industry": "*", "rating": "*",
        "ratingChange": "*", "beginTime": "2000-01-01", "endTime": "2030-01-01",
        "pageNo": "1", "fields": "", "qType": "0", "orgCode": "", "code": code,
        "rcode": "", "p": "1", "pageNum": "1", "pageNumber": "1",
    }
    r = requests.get(url, params=params, headers={"User-Agent": UA, "Referer": "https://data.eastmoney.com/"}, timeout=30)
    rows = r.json().get("data") or []
    return [
        {"date": (x.get("publishDate") or "")[:10], "org": x.get("orgSName"),
         "title": x.get("title"), "rating": x.get("emRatingName")}
        for x in rows[:limit]
    ]


def main() -> int:
    if len(sys.argv) < 2 or not sys.argv[1].strip().isdigit() or len(sys.argv[1].strip()) != 6:
        print(json.dumps({"success": False, "error": "股票代码须为 6 位数字"}, ensure_ascii=False))
        return 2
    code = sys.argv[1].strip()
    out: dict = {"success": True, "code": code}
    for key, fn in (("f10", fetch_f10), ("revenue", fetch_revenue), ("reports", fetch_reports)):
        try:
            out[key] = fn(code)
        except Exception as e:  # noqa: BLE001
            out[f"{key}_error"] = str(e)
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
