#!/usr/bin/env python3
"""个股实时行情桥接脚本。

数据来源由 `a-stock-data` Skill 决定：行情/估值层走腾讯财经（HTTP, GBK, 不封 IP），
字段索引按 Skill 实测校准（见 .cursor/skills/a-stock-data/SKILL.md §1.2）。

用法：
    python scripts/stock_quote.py 600519
输出：单行 JSON。失败时输出 {"success": false, "error": "..."}，退出码非 0。
"""
import json
import sys
import urllib.request


def market_prefix(code: str) -> str:
    """按代码段判断交易所前缀（沪 6/9，北 8，其余深）。"""
    if code.startswith(("6", "9")):
        return "sh"
    if code.startswith("8"):
        return "bj"
    return "sz"


def _f(vals: list[str], idx: int) -> float:
    try:
        return float(vals[idx]) if vals[idx] else 0.0
    except (IndexError, ValueError):
        return 0.0


def fetch_quote(code: str) -> dict:
    prefix = market_prefix(code)
    url = f"https://qt.gtimg.cn/q={prefix}{code}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        raw = resp.read().decode("gbk")

    if '"' not in raw:
        raise ValueError("空响应，代码可能不存在")
    vals = raw.split('"')[1].split("~")
    if len(vals) < 53 or not vals[1]:
        raise ValueError("行情字段不足，代码可能不存在或停牌")

    return {
        "success": True,
        "code": code,
        "name": vals[1],
        "price": _f(vals, 3),
        "lastClose": _f(vals, 4),
        "changeAmt": _f(vals, 31),
        "changePct": _f(vals, 32),
        "turnoverPct": _f(vals, 38),
        "peTtm": _f(vals, 39),
        "pb": _f(vals, 46),
        "mcapYi": _f(vals, 44),
        "floatMcapYi": _f(vals, 45),
        "source": "tencent",
    }


def main() -> int:
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "缺少股票代码参数"}, ensure_ascii=False))
        return 2
    code = sys.argv[1].strip()
    if not code.isdigit() or len(code) != 6:
        print(json.dumps({"success": False, "error": "股票代码须为 6 位数字"}, ensure_ascii=False))
        return 2
    try:
        print(json.dumps(fetch_quote(code), ensure_ascii=False))
        return 0
    except Exception as exc:  # noqa: BLE001 - 统一向调用方返回错误
        print(json.dumps({"success": False, "error": str(exc)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
