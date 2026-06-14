import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export const runtime = 'nodejs';

/**
 * 周期分析 API（对应 docs/RRD_1.md §4 周期性）—— 与股票池对齐。
 *
 * 规则同业务分析：只有股票池内标的才有周期分析。
 * - not-in-pool：未入池 → 不返回内容
 * - pending：已入池但 data/cycle/{code}.json 不存在 → 待离线生成
 * - ready：已入池且分析文件存在 → 返回完整内容
 *
 * 🟦 annual 为客观财务序列（cycle_fetch.py 拉取），🟨 周期性判断由 Cursor
 * 综合后写入 JSON（generatedBy=cursor-dev），AI 接入后仅替换生成方式。
 */

const DATA_DIR = path.join(process.cwd(), 'data');
const POOL_FILE = path.join(DATA_DIR, 'stock-pool.json');
const CYCLE_DIR = path.join(DATA_DIR, 'cycle');

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

async function readCycle(code: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await fs.readFile(path.join(CYCLE_DIR, `${code}.json`), 'utf-8');
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
    isCyclical: false,
    cyclicality: 'weak' as const,
    position: 'unknown' as const,
    positionScore: null,
    summary: '',
    drivers: [],
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

  const cycle = await readCycle(code);
  if (!cycle) {
    return NextResponse.json(emptyShell(code, name ?? code, 'pending', true));
  }

  return NextResponse.json({
    success: true,
    status: 'ready',
    inPool: true,
    ...cycle,
    name: (cycle.name as string) || name || code,
  });
}
