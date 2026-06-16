#!/usr/bin/env python3
"""全球化「原料」取数脚本（对应 docs/RRD_1.md §9 全球化、出海）。

职责：拉取客观的「分地区主营构成」序列，支撑海外业务成长性分析：
  - 历年（年报）境外 / 境内主营收入与占比
  - 最新年度的完整分地区拆分明细

数据源：东财 F10 主营构成 RPT_F10_FN_MAINOP（MAINOP_TYPE=3 即「按地区」）。
  MBI_RATIO 为占主营收入比例（小数）；MAIN_BUSINESS_INCOME 单位为元。

不做定性归纳：出海市场判断 / 地缘·汇率风险 / 海外竞争格局 这类 🟨 AI 判断
留给上层（开发期由 Cursor 综合后写入 data/globalization/{code}.json）。

用法：
    python scripts/globalization_fetch.py 601088
输出：单段 JSON（缩进）。
"""
import json
import sys
import urllib.request
import warnings
from collections import defaultdict

warnings.filterwarnings("ignore")

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

# 地区名称里命中以下关键词判定为「海外 / 境外」收入（含按大洲披露的情况）。
OVERSEAS_KEYWORDS = (
    "境外", "海外", "国外", "出口", "国际", "外销", "其他国家", "其他地区（境外）",
    "亚太", "亚洲", "美洲", "北美", "南美", "欧洲", "非洲", "大洋洲", "东南亚", "中东",
)
# 明确的「境内 / 国内」关键词（优先级高于海外，含国内地理分区，用于排除）。
DOMESTIC_KEYWORDS = (
    "境内", "国内", "中国", "大陆", "内销", "本部",
    "华东", "华南", "华北", "华中", "西南", "西北", "东北", "片区",
)


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
    """小数占比 → 百分数，保留 1 位。"""
    try:
        return round(float(v) * 100, 1)
    except (TypeError, ValueError):
        return None


def is_overseas(name: str) -> bool:
    n = name or ""
    if any(k in n for k in DOMESTIC_KEYWORDS):
        return False
    return any(k in n for k in OVERSEAS_KEYWORDS)


def fetch_region(code: str, years: int = 6):
    secucode = f"{code}.{market_suffix(code)}"
    cols = "SECUCODE,REPORT_DATE,MAINOP_TYPE,ITEM_NAME,MAIN_BUSINESS_INCOME,MBI_RATIO,GROSS_RPOFIT_RATIO,RANK"
    qs = (
        f"reportName=RPT_F10_FN_MAINOP&columns={cols}"
        f"&filter=(SECUCODE=%22{secucode}%22)"
        f"&pageSize=300&pageNumber=1&sortColumns=REPORT_DATE&sortTypes=-1&source=HSF10&client=PC"
    )
    url = f"https://datacenter.eastmoney.com/securities/api/data/v1/get?{qs}"
    req = urllib.request.Request(
        url, headers={"User-Agent": UA, "Referer": "https://emweb.securities.eastmoney.com/"}
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        j = json.loads(resp.read().decode("utf-8"))
    rows = (j.get("result") or {}).get("data") or []

    # 仅保留「按地区」(MAINOP_TYPE=3) 且为年报(12-31)的行，按年份聚合。
    by_year_items: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        if str(r.get("MAINOP_TYPE")) != "3":
            continue
        rd = str(r.get("REPORT_DATE", ""))[:10]
        if not rd.endswith("12-31"):
            continue
        by_year_items[rd[:4]].append({
            "name": r.get("ITEM_NAME") or "",
            "income": _yi(r.get("MAIN_BUSINESS_INCOME")),
            "ratio": _pct(r.get("MBI_RATIO")),
            "grossMargin": _pct(r.get("GROSS_RPOFIT_RATIO")),
        })

    annual = []
    for y in sorted(by_year_items):
        items = by_year_items[y]
        total = sum(it["income"] for it in items if it["income"] is not None) or None
        overseas_income = sum(
            it["income"] for it in items if it["income"] is not None and is_overseas(it["name"])
        )
        has_overseas = any(is_overseas(it["name"]) for it in items)
        overseas_ratio = (
            round(overseas_income / total * 100, 1) if (total and has_overseas) else (0.0 if has_overseas else None)
        )
        annual.append({
            "year": y,
            "totalRevenue": round(total, 2) if total else None,
            "overseasIncome": round(overseas_income, 2) if has_overseas else None,
            "overseasRatio": overseas_ratio,
        })

    latest_year = max(by_year_items) if by_year_items else None
    latest_breakdown = sorted(
        by_year_items.get(latest_year, []),
        key=lambda x: (x["income"] is None, -(x["income"] or 0)),
    ) if latest_year else []

    return annual[-years:], latest_year, latest_breakdown


def main() -> int:
    if len(sys.argv) < 2 or not sys.argv[1].strip().isdigit() or len(sys.argv[1].strip()) != 6:
        print(json.dumps({"success": False, "error": "股票代码须为 6 位数字"}, ensure_ascii=False))
        return 2
    code = sys.argv[1].strip()
    try:
        annual, latest_year, latest_breakdown = fetch_region(code)
        print(json.dumps({
            "success": True,
            "code": code,
            "annual": annual,
            "latestYear": latest_year,
            "latestBreakdown": latest_breakdown,
        }, ensure_ascii=False, indent=2))
        return 0
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"success": False, "error": str(exc)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
