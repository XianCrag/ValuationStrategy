import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export const runtime = 'nodejs';

/**
 * 业务分析 API（对应 docs/RRD_1.md §2）—— 与股票池对齐。
 *
 * 规则：只有股票池（data/stock-pool.json）内的标的才有业务分析。
 * - not-in-pool：未入池 → 不返回分析，前端提示「加入股票池后生成」
 * - pending：已入池但 data/business/{code}.json 尚不存在 → 待离线生成
 * - ready：已入池且分析文件存在 → 返回完整内容
 *
 * 🟨 内容为定性分析（业务模式 / 收入结构占比 / 单一产品依赖度），
 * 开发期由 Cursor 用 a-stock-data 素材综合后写入 JSON（generatedBy=cursor-dev），
 * AI 接入后仅替换生成方式，本接口契约不变。
 */

const DATA_DIR = path.join(process.cwd(), 'data');
const POOL_FILE = path.join(DATA_DIR, 'stock-pool.json');
const BUSINESS_DIR = path.join(DATA_DIR, 'business');

interface StoredAnalysis {
  code: string;
  name: string;
  segments: unknown[];
  revenues: unknown[];
  dependency: unknown;
  source: string;
  confidence: string;
  reportPeriod: string | null;
  generatedBy: string;
  generatedAt: string | null;
}

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

async function readAnalysis(code: string): Promise<StoredAnalysis | null> {
  try {
    const raw = await fs.readFile(path.join(BUSINESS_DIR, `${code}.json`), 'utf-8');
    return JSON.parse(raw) as StoredAnalysis;
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
    segments: [],
    revenues: [],
    dependency: null,
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

  const analysis = await readAnalysis(code);
  if (!analysis) {
    return NextResponse.json(emptyShell(code, name ?? code, 'pending', true));
  }

  return NextResponse.json({
    success: true,
    code,
    name: analysis.name || name || code,
    status: 'ready',
    inPool: true,
    segments: analysis.segments,
    revenues: analysis.revenues,
    dependency: analysis.dependency,
    source: analysis.source,
    confidence: analysis.confidence,
    reportPeriod: analysis.reportPeriod,
    generatedBy: analysis.generatedBy,
    generatedAt: analysis.generatedAt,
  });
}
