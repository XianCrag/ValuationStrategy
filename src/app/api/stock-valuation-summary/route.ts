import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { computeValuation, type FinancialMetrics } from './compute';

export const runtime = 'nodejs';

/**
 * 估值总结 API —— 100% 公式计算，无 AI 推荐、无主观分析、不存储估值结论。
 *
 * 读取 data/financials/{code}.json 的客观财务指标（由 valuation_metrics_fetch.py 取数），
 * 按 compute.ts 的固定公式实时计算四种方法的合理价值。仅股票池内标的有内容。
 */

const DATA_DIR = path.join(process.cwd(), 'data');
const POOL_FILE = path.join(DATA_DIR, 'stock-pool.json');
const FIN_DIR = path.join(DATA_DIR, 'financials');

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

async function readFinancials(code: string): Promise<FinancialMetrics | null> {
  try {
    const raw = await fs.readFile(path.join(FIN_DIR, `${code}.json`), 'utf-8');
    return JSON.parse(raw) as FinancialMetrics;
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
    medianFairValue: null,
    safetyMargin: 0,
    snapshotPrice: null,
    reportPeriod: null,
    source: '',
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

  const fin = await readFinancials(code);
  if (!fin) {
    return NextResponse.json(emptyShell(code, name ?? code, 'pending', true));
  }

  const { methods, medianFairValue, safetyMargin } = computeValuation(fin);

  return NextResponse.json({
    success: true,
    status: 'ready',
    inPool: true,
    code,
    name: fin.name || name || code,
    methods,
    medianFairValue,
    safetyMargin,
    snapshotPrice: fin.snapshotPrice ?? null,
    reportPeriod: fin.reportPeriod ?? null,
    source: 'data/financials（客观财务指标）+ 固定公式计算',
    generatedAt: fin.generatedAt ?? null,
  });
}
