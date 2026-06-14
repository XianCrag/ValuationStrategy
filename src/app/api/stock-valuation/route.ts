import { NextRequest, NextResponse } from 'next/server';
import { runPythonScript } from '../_lib/scripts';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * 个股估值分析 API（PE 历史分位 / 股息率 / ROE / 击球区）。
 *
 * 数据来源：`a-stock-data` Skill（腾讯现价 + mootdx 日线 + 东财 F10/分红），通过本地
 * Python venv 执行 `scripts/stock_valuation.py` 计算（约 2~8 秒）。
 * 线上无 Python 运行时 → 返回 offline 标记，由前端回退到选股池快照。
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')?.trim() ?? '';
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { success: false, error: '请输入 6 位股票代码' },
      { status: 400 }
    );
  }
  const result = await runPythonScript('stock_valuation.py', code);
  const status = result.success || result.offline ? 200 : 502;
  return NextResponse.json(result, { status });
}
