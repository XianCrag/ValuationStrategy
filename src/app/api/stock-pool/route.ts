import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { computeValuation, strikeZoneOf, type FinancialMetrics } from '../stock-valuation-summary/compute';

export const runtime = 'nodejs';

/**
 * 选股池 API —— 服务端 JSON 文件持久化。
 *
 * - GET    /api/stock-pool            列出全部已加入标的
 * - POST   /api/stock-pool  {entry}   加入 / 更新一个标的（按 code 去重）
 * - DELETE /api/stock-pool?code=xxx   移出一个标的
 *
 * 存储文件：data/stock-pool.json（已 gitignore）。仅存快照，行情/估值数据
 * 由各自接口实时刷新（见 RRD_1.md §11）。
 */

const DATA_DIR = path.join(process.cwd(), 'data');
const POOL_FILE = path.join(DATA_DIR, 'stock-pool.json');
const FIN_DIR = path.join(DATA_DIR, 'financials');

interface PoolEntry {
  code: string;
  name: string;
  industry: string;
  price: number | null;
  peTtm: number | null;
  pePercentile: number | null;
  dividendYield: number | null;
  roe: number | null;
  roePeriod: string | null;
  strikeZone: string;
  addedAt: string;
}

async function readPool(): Promise<PoolEntry[]> {
  try {
    const raw = await fs.readFile(POOL_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PoolEntry[]) : [];
  } catch {
    return [];
  }
}

async function writePool(items: PoolEntry[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(POOL_FILE, JSON.stringify(items, null, 2), 'utf-8');
}

async function readFinancials(code: string): Promise<FinancialMetrics | null> {
  try {
    const raw = await fs.readFile(path.join(FIN_DIR, `${code}.json`), 'utf-8');
    return JSON.parse(raw) as FinancialMetrics;
  } catch {
    return null;
  }
}

/**
 * 用「估值中枢」公式（四方法合理价中位 × 安全边际）按快照价重算击球区，
 * 与详情页头部 / 估值总结模块口径一致。无 financials 时回退到存储值。
 */
async function withStrikeZone(items: PoolEntry[]): Promise<PoolEntry[]> {
  return Promise.all(
    items.map(async (it) => {
      const fin = await readFinancials(it.code);
      if (!fin) return it;
      const { medianFairValue, safetyMargin } = computeValuation(fin);
      return { ...it, strikeZone: strikeZoneOf(it.price, medianFairValue, safetyMargin) };
    })
  );
}

export async function GET() {
  const items = await withStrikeZone(await readPool());
  return NextResponse.json({ success: true, items });
}

export async function POST(request: NextRequest) {
  let body: Partial<PoolEntry>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: '请求体不是合法 JSON' }, { status: 400 });
  }

  const code = (body.code ?? '').trim();
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ success: false, error: '股票代码须为 6 位数字' }, { status: 400 });
  }

  const entry: PoolEntry = {
    code,
    name: body.name ?? code,
    industry: body.industry || '未分类',
    price: body.price ?? null,
    peTtm: body.peTtm ?? null,
    pePercentile: body.pePercentile ?? null,
    dividendYield: body.dividendYield ?? null,
    roe: body.roe ?? null,
    roePeriod: body.roePeriod ?? null,
    strikeZone: body.strikeZone ?? 'unknown',
    addedAt: new Date().toISOString(),
  };

  const items = await readPool();
  const idx = items.findIndex((i) => i.code === code);
  if (idx >= 0) {
    entry.addedAt = items[idx].addedAt; // 保留首次加入时间
    items[idx] = entry;
  } else {
    items.push(entry);
  }
  await writePool(items);

  return NextResponse.json({ success: true, items });
}

export async function DELETE(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')?.trim() ?? '';
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ success: false, error: '股票代码须为 6 位数字' }, { status: 400 });
  }
  const items = (await readPool()).filter((i) => i.code !== code);
  await writePool(items);
  return NextResponse.json({ success: true, items });
}
