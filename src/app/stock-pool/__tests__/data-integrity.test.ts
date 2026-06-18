/**
 * 选股池数据完整性校验。
 *
 * 目的：在 CI / 本地阶段就拦住「字段缺失或枚举越界」的脏数据，避免前端运行时报错
 * （例如 CycleAnalysis 用 data.position 查表，若值不在枚举内会 `Cannot read
 * properties of undefined`）。
 *
 * 校验范围：股票池（data/stock-pool.json）内每只标的，在 7 个分析模块 + financials
 * 目录下的存量 JSON 文件，逐字段检查类型与枚举取值，并保证文件齐备、code 与文件名一致。
 *
 * 这里校验的是「存量文件」形态（不含 route 注入的 success/status/inPool）。枚举集合
 * 必须与 src/app/stock-pool/types.ts 的联合类型及各组件的 *_META 查表键保持一致。
 */
import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const POOL_FILE = path.join(DATA_DIR, 'stock-pool.json');

// ── 枚举集合（与 types.ts 联合类型一致；越界即会导致前端查表 undefined）──────────
const CONFIDENCE = new Set(['high', 'medium', 'low']);
const GENERATED_BY = new Set(['cursor-dev', 'ai', 'mock']);
const TREND_DIRECTION = new Set(['up', 'flat', 'down']);
const CYCLICALITY = new Set(['strong', 'moderate', 'weak']);
const CYCLE_POSITION = new Set(['trough', 'rising', 'peak', 'falling', 'unknown']);
const SHAREHOLDER_RATING = new Set(['strong', 'moderate', 'weak']);
const MOAT_STRENGTH = new Set(['wide', 'moderate', 'narrow']);
const POLICY_STANCE = new Set(['tailwind', 'neutral', 'headwind']);
const POLICY_IMPACT = new Set(['positive', 'neutral', 'negative']);
const SCORE_DIMENSION_ID = new Set(['stability', 'growth', 'cyclicality']);

const ANALYSIS_MODULES = [
  'business',
  'cycle',
  'shareholder',
  'globalization',
  'moat',
  'policy',
  'scorecard',
] as const;

type Json = Record<string, unknown>;

// ── 类型断言小工具：把错误累加到 errs，给出可定位的字段路径 ───────────────────────
function isStr(v: unknown): v is string {
  return typeof v === 'string';
}
function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}
function isBool(v: unknown): v is boolean {
  return typeof v === 'boolean';
}

function checkStr(errs: string[], o: Json, key: string) {
  if (!isStr(o[key]) || (o[key] as string).length === 0) errs.push(`${key} 必须为非空字符串`);
}
function checkNumOrNull(errs: string[], o: Json, key: string) {
  if (o[key] !== null && !isNum(o[key])) errs.push(`${key} 必须为数字或 null`);
}
function checkBool(errs: string[], o: Json, key: string) {
  if (!isBool(o[key])) errs.push(`${key} 必须为布尔值`);
}
function checkStrOrNull(errs: string[], o: Json, key: string) {
  if (o[key] !== null && !isStr(o[key])) errs.push(`${key} 必须为字符串或 null`);
}
function checkEnum(errs: string[], o: Json, key: string, set: Set<string>) {
  if (!isStr(o[key]) || !set.has(o[key] as string)) {
    errs.push(`${key}="${String(o[key])}" 越界（允许：${[...set].join('/')}）`);
  }
}
function checkArray(errs: string[], o: Json, key: string): unknown[] {
  if (!Array.isArray(o[key])) {
    errs.push(`${key} 必须为数组`);
    return [];
  }
  return o[key] as unknown[];
}
function checkStrArray(errs: string[], o: Json, key: string) {
  const arr = checkArray(errs, o, key);
  arr.forEach((v, i) => {
    if (!isStr(v)) errs.push(`${key}[${i}] 必须为字符串`);
  });
}
function checkScore(errs: string[], o: Json, key: string, where: string) {
  if (!isNum(o[key]) || (o[key] as number) < 0 || (o[key] as number) > 5) {
    errs.push(`${where}.${key}=${String(o[key])} 必须为 0~5 的数字`);
  }
}

/** 7 个分析模块存量文件的公共尾部字段。 */
function checkCommonMeta(errs: string[], o: Json) {
  checkStr(errs, o, 'code');
  checkStr(errs, o, 'name');
  checkStr(errs, o, 'source');
  checkEnum(errs, o, 'confidence', CONFIDENCE);
  checkStrOrNull(errs, o, 'reportPeriod');
  checkEnum(errs, o, 'generatedBy', GENERATED_BY);
  checkStrOrNull(errs, o, 'generatedAt');
}

// ── 各模块校验器 ──────────────────────────────────────────────────────────────
const VALIDATORS: Record<(typeof ANALYSIS_MODULES)[number], (o: Json, errs: string[]) => void> = {
  business(o, errs) {
    checkCommonMeta(errs, o);
    checkArray(errs, o, 'segments').forEach((s, i) => {
      const seg = s as Json;
      if (!isStr(seg.name)) errs.push(`segments[${i}].name 必须为字符串`);
      if (!isStr(seg.position)) errs.push(`segments[${i}].position 必须为字符串`);
      if (!isStr(seg.features)) errs.push(`segments[${i}].features 必须为字符串`);
    });
    checkArray(errs, o, 'revenues').forEach((r, i) => {
      const rev = r as Json;
      if (!isStr(rev.source)) errs.push(`revenues[${i}].source 必须为字符串`);
      if (!isStr(rev.share)) errs.push(`revenues[${i}].share 必须为字符串`);
      if (!isStr(rev.shareYear)) errs.push(`revenues[${i}].shareYear 必须为字符串`);
      if (!isStr(rev.trend)) errs.push(`revenues[${i}].trend 必须为字符串`);
      if (!isStr(rev.trendDirection) || !TREND_DIRECTION.has(rev.trendDirection as string))
        errs.push(`revenues[${i}].trendDirection="${String(rev.trendDirection)}" 越界（up/flat/down）`);
    });
    if (o.dependency !== null) {
      const dep = o.dependency as Json;
      if (typeof dep !== 'object') errs.push('dependency 必须为对象或 null');
      else {
        if (!isNum(dep.topN)) errs.push('dependency.topN 必须为数字');
        if (!isStr(dep.detail)) errs.push('dependency.detail 必须为字符串');
        if (!isStr(dep.share)) errs.push('dependency.share 必须为字符串');
        if (!isStr(dep.note)) errs.push('dependency.note 必须为字符串');
      }
    }
  },

  cycle(o, errs) {
    checkCommonMeta(errs, o);
    checkBool(errs, o, 'isCyclical');
    checkEnum(errs, o, 'cyclicality', CYCLICALITY);
    checkEnum(errs, o, 'position', CYCLE_POSITION);
    checkNumOrNull(errs, o, 'positionScore');
    checkStr(errs, o, 'summary');
    checkStrArray(errs, o, 'drivers');
    const annual = checkArray(errs, o, 'annual');
    if (annual.length === 0) errs.push('annual 不能为空');
    annual.forEach((p, i) => {
      const pt = p as Json;
      if (!isStr(pt.year)) errs.push(`annual[${i}].year 必须为字符串`);
      ['revenue', 'netProfit', 'revenueYoY', 'netProfitYoY', 'roe', 'grossMargin', 'netMargin'].forEach((k) => {
        if (pt[k] !== null && !isNum(pt[k])) errs.push(`annual[${i}].${k} 必须为数字或 null`);
      });
      if ('priceClose' in pt && pt.priceClose !== null && !isNum(pt.priceClose))
        errs.push(`annual[${i}].priceClose 必须为数字或 null`);
    });
  },

  shareholder(o, errs) {
    checkCommonMeta(errs, o);
    checkEnum(errs, o, 'rating', SHAREHOLDER_RATING);
    checkStr(errs, o, 'buybackNote');
    checkStr(errs, o, 'summary');
    ['mcapYi', 'currentDividendYield', 'payoutRatioLatest', 'consecutiveYears', 'cumulativeDividend', 'cumulativeToMcap', 'dividendToRevenue'].forEach(
      (k) => checkNumOrNull(errs, o, k),
    );
    const annual = checkArray(errs, o, 'annual');
    if (annual.length === 0) errs.push('annual 不能为空');
    annual.forEach((p, i) => {
      const pt = p as Json;
      if (!isStr(pt.year)) errs.push(`annual[${i}].year 必须为字符串`);
      ['dividend', 'netProfit', 'revenue', 'payoutRatio'].forEach((k) => checkNumOrNull(errs, pt, k));
    });
  },

  globalization(o, errs) {
    checkCommonMeta(errs, o);
    checkStrOrNull(errs, o, 'latestYear');
    checkStr(errs, o, 'summary');
    checkStrArray(errs, o, 'markets');
    checkStrArray(errs, o, 'opportunities');
    checkStrArray(errs, o, 'risks');
    const annual = checkArray(errs, o, 'annual');
    if (annual.length === 0) errs.push('annual 不能为空');
    annual.forEach((p, i) => {
      const pt = p as Json;
      if (!isStr(pt.year)) errs.push(`annual[${i}].year 必须为字符串`);
      ['totalRevenue', 'overseasIncome', 'overseasRatio'].forEach((k) => checkNumOrNull(errs, pt, k));
    });
    checkArray(errs, o, 'latestBreakdown').forEach((b, i) => {
      const reg = b as Json;
      if (!isStr(reg.name)) errs.push(`latestBreakdown[${i}].name 必须为字符串`);
      ['income', 'ratio', 'grossMargin'].forEach((k) => checkNumOrNull(errs, reg, k));
    });
  },

  moat(o, errs) {
    checkCommonMeta(errs, o);
    checkEnum(errs, o, 'strength', MOAT_STRENGTH);
    checkStr(errs, o, 'summary');
    const dims = checkArray(errs, o, 'dimensions');
    if (dims.length === 0) errs.push('dimensions 不能为空');
    dims.forEach((d, i) => {
      const dim = d as Json;
      if (!isStr(dim.name)) errs.push(`dimensions[${i}].name 必须为字符串`);
      if (!isStr(dim.note)) errs.push(`dimensions[${i}].note 必须为字符串`);
      checkScore(errs, dim, 'score', `dimensions[${i}]`);
    });
    checkArray(errs, o, 'competitors').forEach((c, i) => {
      const cp = c as Json;
      if (!isStr(cp.name)) errs.push(`competitors[${i}].name 必须为字符串`);
      if (!isStr(cp.note)) errs.push(`competitors[${i}].note 必须为字符串`);
    });
  },

  policy(o, errs) {
    checkCommonMeta(errs, o);
    checkEnum(errs, o, 'stance', POLICY_STANCE);
    checkStr(errs, o, 'summary');
    checkStrArray(errs, o, 'risks');
    const events = checkArray(errs, o, 'events');
    events.forEach((e, i) => {
      const ev = e as Json;
      if (!isStr(ev.date)) errs.push(`events[${i}].date 必须为字符串`);
      if (!isStr(ev.title)) errs.push(`events[${i}].title 必须为字符串`);
      if (!isStr(ev.note)) errs.push(`events[${i}].note 必须为字符串`);
      if (!isStr(ev.impact) || !POLICY_IMPACT.has(ev.impact as string))
        errs.push(`events[${i}].impact="${String(ev.impact)}" 越界（positive/neutral/negative）`);
    });
  },

  scorecard(o, errs) {
    checkCommonMeta(errs, o);
    checkNumOrNull(errs, o, 'overallScore');
    checkStr(errs, o, 'profileTag');
    checkStr(errs, o, 'summary');
    const dims = checkArray(errs, o, 'dimensions');
    if (dims.length === 0) errs.push('dimensions 不能为空');
    dims.forEach((d, i) => {
      const dim = d as Json;
      if (!isStr(dim.id) || !SCORE_DIMENSION_ID.has(dim.id as string))
        errs.push(`dimensions[${i}].id="${String(dim.id)}" 越界（stability/growth/cyclicality）`);
      if (!isStr(dim.name)) errs.push(`dimensions[${i}].name 必须为字符串`);
      if (!isStr(dim.summary)) errs.push(`dimensions[${i}].summary 必须为字符串`);
      checkScore(errs, dim, 'score', `dimensions[${i}]`);
      checkArray(errs, dim, 'factors').forEach((f, j) => {
        const fac = f as Json;
        if (!isStr(fac.name)) errs.push(`dimensions[${i}].factors[${j}].name 必须为字符串`);
        if (!isStr(fac.note)) errs.push(`dimensions[${i}].factors[${j}].note 必须为字符串`);
        checkScore(errs, fac, 'score', `dimensions[${i}].factors[${j}]`);
      });
    });
  },
};

/** financials（估值公式引擎输入）校验。 */
function validateFinancials(o: Json, errs: string[]) {
  checkStr(errs, o, 'code');
  checkNumOrNull(errs, o, 'snapshotPrice');
  checkNumOrNull(errs, o, 'sharesYi');
  checkNumOrNull(errs, o, 'dpsAvg3y');
  checkStrOrNull(errs, o, 'reportPeriod');
  if ('netDebtYi' in o) checkNumOrNull(errs, o, 'netDebtYi');
  if ('minorityYi' in o) checkNumOrNull(errs, o, 'minorityYi');
  const annual = checkArray(errs, o, 'annual');
  if (annual.length === 0) errs.push('annual 不能为空');
  annual.forEach((p, i) => {
    const pt = p as Json;
    if (!isStr(pt.year)) errs.push(`annual[${i}].year 必须为字符串`);
    ['revenueYi', 'netProfitYi', 'ebitYi', 'netMargin'].forEach((k) => checkNumOrNull(errs, pt, k));
  });
}

async function readJson(file: string): Promise<Json> {
  const raw = await fs.readFile(file, 'utf-8');
  return JSON.parse(raw) as Json;
}

describe('选股池数据完整性', () => {
  let pooledCodes: string[] = [];

  beforeAll(async () => {
    const pool = JSON.parse(await fs.readFile(POOL_FILE, 'utf-8')) as Array<{ code: string }>;
    pooledCodes = pool.map((p) => p.code);
  });

  it('股票池非空且 code 均为 6 位数字', async () => {
    const pool = JSON.parse(await fs.readFile(POOL_FILE, 'utf-8')) as Array<{ code: string; name: string }>;
    expect(pool.length).toBeGreaterThan(0);
    for (const p of pool) {
      expect(p.code).toMatch(/^\d{6}$/);
      expect(typeof p.name).toBe('string');
    }
  });

  it('每只池内标的在 7 个分析模块 + financials 下均有数据文件', async () => {
    const pool = JSON.parse(await fs.readFile(POOL_FILE, 'utf-8')) as Array<{ code: string }>;
    const missing: string[] = [];
    for (const { code } of pool) {
      for (const mod of [...ANALYSIS_MODULES, 'financials']) {
        const f = path.join(DATA_DIR, mod, `${code}.json`);
        try {
          await fs.access(f);
        } catch {
          missing.push(`data/${mod}/${code}.json`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  describe.each(ANALYSIS_MODULES)('%s 模块字段与枚举', (mod) => {
    it(`${mod}: 所有池内文件字段合法`, async () => {
      const pool = JSON.parse(await fs.readFile(POOL_FILE, 'utf-8')) as Array<{ code: string }>;
      const allErrors: string[] = [];
      for (const { code } of pool) {
        const file = path.join(DATA_DIR, mod, `${code}.json`);
        let obj: Json;
        try {
          obj = await readJson(file);
        } catch (e) {
          allErrors.push(`${mod}/${code}.json: 无法读取或非合法 JSON（${(e as Error).message}）`);
          continue;
        }
        const errs: string[] = [];
        if (isStr(obj.code) && obj.code !== code) errs.push(`code 字段(${obj.code}) 与文件名(${code}) 不一致`);
        VALIDATORS[mod](obj, errs);
        errs.forEach((m) => allErrors.push(`${mod}/${code}.json → ${m}`));
      }
      expect(allErrors).toEqual([]);
    });
  });

  it('financials: 所有池内文件字段合法', async () => {
    const pool = JSON.parse(await fs.readFile(POOL_FILE, 'utf-8')) as Array<{ code: string }>;
    const allErrors: string[] = [];
    for (const { code } of pool) {
      const file = path.join(DATA_DIR, 'financials', `${code}.json`);
      let obj: Json;
      try {
        obj = await readJson(file);
      } catch (e) {
        allErrors.push(`financials/${code}.json: 无法读取或非合法 JSON（${(e as Error).message}）`);
        continue;
      }
      const errs: string[] = [];
      if (isStr(obj.code) && obj.code !== code) errs.push(`code 字段(${obj.code}) 与文件名(${code}) 不一致`);
      validateFinancials(obj, errs);
      errs.forEach((m) => allErrors.push(`financials/${code}.json → ${m}`));
    }
    expect(allErrors).toEqual([]);
  });
});
