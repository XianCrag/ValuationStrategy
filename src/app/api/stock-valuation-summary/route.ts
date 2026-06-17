import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export const runtime = 'nodejs';

/**
 * 估值总结 API（对应 docs/RRD_1.md §10，三种估值方法 + 推荐 + 击球区 + 多空）—— 与股票池对齐。
 *
 * 规则同其他分析模块：仅股票池内标的有内容（not-in-pool / pending / ready）。
 * 🟦 客观锚点由 valuation_fetch.py 提供，🟨 方法假设/推荐/安全边际/多空由 Cursor 综合
 * 后写入 data/valuation/{code}.json（generatedBy=cursor-dev）。
 *
 * 注意：与 /api/stock-valuation（实时 PE 分位概览）不同，本路由是离线、文件驱动的深度估值。
 */

const DATA_DIR = path.join(process.cwd(), 'data');
const POOL_FILE = path.join(DATA_DIR, 'stock-pool.json');
const VAL_DIR = path.join(DATA_DIR, 'valuation');

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

async function readValuation(code: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await fs.readFile(path.join(VAL_DIR, `${code}.json`), 'utf-8');
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
    methods: [],
    recommendedMethod: 'dividend' as const,
    recommendationReason: '',
    fairValue: null,
    safetyMargin: 0,
    strikePrice: null,
    snapshotPrice: null,
    bullPoints: [],
    bearPoints: [],
    pePercentile: null,
    dividendYield: null,
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

  const val = await readValuation(code);
  if (!val) {
    return NextResponse.json(emptyShell(code, name ?? code, 'pending', true));
  }

  return NextResponse.json({
    success: true,
    status: 'ready',
    inPool: true,
    ...val,
    name: (val.name as string) || name || code,
  });
}
