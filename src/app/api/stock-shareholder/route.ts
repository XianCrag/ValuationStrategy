import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export const runtime = 'nodejs';

/**
 * 股东回报分析 API（对应 docs/RRD_1.md §6）—— 与股票池对齐。
 *
 * 规则同其他分析模块：仅股票池内标的有内容。
 * - not-in-pool / pending / ready 三态。
 *
 * 🟦 序列与比率客观计算（shareholder_fetch.py），🟨 回购说明与评价由 Cursor 综合
 * 后写入 data/shareholder/{code}.json（generatedBy=cursor-dev）。
 */

const DATA_DIR = path.join(process.cwd(), 'data');
const POOL_FILE = path.join(DATA_DIR, 'stock-pool.json');
const SH_DIR = path.join(DATA_DIR, 'shareholder');

async function isInPool(code: string): Promise<{ inPool: boolean; name: string | null }> {
  try {
    const raw = await fs.readFile(POOL_FILE, 'utf-8');
    const items = JSON.parse(raw) as Array<{ code: string; name: string }>;
    const hit = Array.isArray(items) ? items.find((i) => i.code === code) : undefined;
    return { inPool: Boolean(hit), name: hit?.name ?? null };
  } catch {
    return { inPool: false, name: null };
  }
}

async function readShareholder(code: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await fs.readFile(path.join(SH_DIR, `${code}.json`), 'utf-8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function emptyShell(code: string, name: string, status: 'pending' | 'not-in-pool', inPool: boolean) {
  return {
    success: true,
    code,
    name,
    status,
    inPool,
    annual: [],
    mcapYi: null,
    currentDividendYield: null,
    payoutRatioLatest: null,
    consecutiveYears: null,
    cumulativeDividend: null,
    cumulativeToMcap: null,
    dividendToRevenue: null,
    buybackNote: '',
    rating: 'weak' as const,
    summary: '',
    source: '',
    confidence: 'low' as const,
    reportPeriod: null,
    generatedBy: 'cursor-dev' as const,
    generatedAt: null,
  };
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')?.trim() ?? '';
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ success: false, error: '股票代码须为 6 位数字' }, { status: 400 });
  }

  const { inPool, name } = await isInPool(code);
  if (!inPool) {
    return NextResponse.json(emptyShell(code, name ?? code, 'not-in-pool', false));
  }

  const sh = await readShareholder(code);
  if (!sh) {
    return NextResponse.json(emptyShell(code, name ?? code, 'pending', true));
  }

  return NextResponse.json({
    success: true,
    status: 'ready',
    inPool: true,
    ...sh,
    name: (sh.name as string) || name || code,
  });
}
