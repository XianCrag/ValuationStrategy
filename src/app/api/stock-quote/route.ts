import { NextRequest, NextResponse } from 'next/server';
import { runPythonScript } from '../_lib/scripts';

export const runtime = 'nodejs';

/**
 * 个股实时行情 API。
 *
 * 数据来源：`a-stock-data` Skill（行情/估值层走腾讯财经），通过本地 Python venv
 * 执行 `scripts/stock_quote.py` 取数。线上无 Python 运行时 → 返回 offline 标记。
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')?.trim() ?? '';

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { success: false, error: '请输入 6 位股票代码' },
      { status: 400 }
    );
  }

  const result = await runPythonScript('stock_quote.py', code);
  const status = result.success || result.offline ? 200 : 502;
  return NextResponse.json(result, { status });
}
