import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export const runtime = 'nodejs';

/**
 * 政策、监管环境分析 API（对应 docs/RRD_1.md §7）—— 与股票池对齐。
 *
 * 规则同其他分析模块：仅股票池内标的有内容（not-in-pool / pending / ready）。
 * 🟨 纯 AI 定性，由 Cursor 综合后写入 data/policy/{code}.json（generatedBy=cursor-dev）。
 */

const DATA_DIR = path.join(process.cwd(), 'data');
const POOL_FILE = path.join(DATA_DIR, 'stock-pool.json');
const POLICY_DIR = path.join(DATA_DIR, 'policy');

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

async function readPolicy(code: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await fs.readFile(path.join(POLICY_DIR, `${code}.json`), 'utf-8');
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
    stance: 'neutral' as const,
    summary: '',
    events: [],
    risks: [],
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

  const policy = await readPolicy(code);
  if (!policy) {
    return NextResponse.json(emptyShell(code, name ?? code, 'pending', true));
  }

  return NextResponse.json({
    success: true,
    status: 'ready',
    inPool: true,
    ...policy,
    name: (policy.name as string) || name || code,
  });
}
