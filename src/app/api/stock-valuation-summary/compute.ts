import type { ValuationMethod, ValuationMethodId } from '@/app/stock-pool/types';

/**
 * 估值「纯公式」计算（无任何主观判断 / AI 推荐 / 存储结论）。
 *
 * 输入：data/financials/{code}.json 的客观财务指标（由 valuation_metrics_fetch.py 取数）。
 * 输出：四种方法的合理价值 + 公式 + 中间量。全部由下方固定常数与公式确定，可复现。
 */

// ── 固定公式常数（透明、统一适用，不做个股微调） ──────────────────────
/** ① 股息率法：目标股息率（合理价 = DPS ÷ 目标股息率） */
const TARGET_DIVIDEND_YIELD = 0.05;
/** ② EV/EBIT 法：统一合理 EV/EBIT 倍数 */
const BASE_EV_EBIT = 10;
/** ③ 盈利能力法 & ④ PS 法：统一合理 PE 倍数 */
const BASE_PE = 12;
/** 常态化窗口：取最近 N 个完整年度求均值（②③） */
const NORM_YEARS = 5;
/** 固定安全边际（击球价 = 合理价值 ×（1 − 安全边际）） */
const SAFETY_MARGIN = 0.3;

export interface AnnualMetric {
  year: string;
  revenueYi: number | null;
  netProfitYi: number | null;
  ebitYi: number | null;
  netMargin: number | null;
}

export interface FinancialMetrics {
  code: string;
  name: string;
  snapshotPrice: number | null;
  sharesYi: number | null;
  annual: AnnualMetric[];
  netDebtYi: number | null;
  minorityYi: number | null;
  /** 近 3 个财年平均每股股息（按所属财年聚合，平滑特别分红） */
  dpsAvg3y: number | null;
  reportPeriod: string | null;
  generatedAt: string | null;
}

const METHOD_NAME: Record<ValuationMethodId, string> = {
  dividend: '股息率估值',
  dcf: 'EV/EBIT 估值',
  'earnings-power': '未来盈利能力估值',
  ps: 'PS 市销率估值',
};

const r2 = (v: number) => Math.round(v * 100) / 100;
const yi = (v: number) => `${r2(v)} 亿`;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
function median(xs: number[]): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function strikeOf(fair: number | null): number | null {
  return fair == null ? null : r2(fair * (1 - SAFETY_MARGIN));
}

function na(id: ValuationMethodId, reason: string): ValuationMethod {
  return { id, name: METHOD_NAME[id], applicable: false, naReason: reason, fairValue: null, strikePrice: null, formula: '', rows: [] };
}

/** ① 股息率法：合理价 = 近3年平均 DPS ÷ 目标股息率。 */
function dividendMethod(m: FinancialMetrics): ValuationMethod {
  const dps = m.dpsAvg3y ?? 0;
  if (!(dps > 0)) return na('dividend', '近 3 年无分红，股息率法不可计算');
  const fair = r2(dps / TARGET_DIVIDEND_YIELD);
  return {
    id: 'dividend',
    name: METHOD_NAME.dividend,
    applicable: true,
    fairValue: fair,
    strikePrice: strikeOf(fair),
    formula: `合理价 = 近3年平均每股股息 ÷ 目标股息率 ${(TARGET_DIVIDEND_YIELD * 100).toFixed(0)}%`,
    rows: [
      { label: '近3年平均每股股息 DPS', value: `${dps} 元` },
      { label: '目标股息率', value: `${(TARGET_DIVIDEND_YIELD * 100).toFixed(0)}%` },
      { label: `= 合理价值`, value: `${fair} 元` },
    ],
  };
}

/** ② EV/EBIT 法：合理价 = (合理倍数 × 常态EBIT − 净负债 − 少数股东权益) ÷ 总股本。 */
function evEbitMethod(m: FinancialMetrics): ValuationMethod {
  const shares = m.sharesYi ?? 0;
  const ebits = m.annual.slice(-NORM_YEARS).map((a) => a.ebitYi).filter((v): v is number => v != null);
  if (!ebits.length) return na('dcf', '缺少 EBIT 数据');
  if (!(shares > 0)) return na('dcf', '缺少总股本');
  const ebitNorm = r2(mean(ebits));
  if (!(ebitNorm > 0)) return na('dcf', `常态 EBIT ≤ 0（近${ebits.length}年均 ${ebitNorm} 亿）`);
  const netDebt = m.netDebtYi ?? 0;
  const minority = m.minorityYi ?? 0;
  const fairEv = r2(BASE_EV_EBIT * ebitNorm);
  const equity = r2(fairEv - netDebt - minority);
  if (!(equity > 0)) return na('dcf', '股权价值 ≤ 0（净负债 + 少数股东权益过高）');
  const fair = r2(equity / shares);
  return {
    id: 'dcf',
    name: METHOD_NAME.dcf,
    applicable: true,
    fairValue: fair,
    strikePrice: strikeOf(fair),
    formula: `合理价 = (${BASE_EV_EBIT}× × 常态EBIT − 净负债 − 少数股东权益) ÷ 总股本`,
    rows: [
      { label: `常态 EBIT（近${ebits.length}年均）`, value: yi(ebitNorm) },
      { label: '合理 EV/EBIT 倍数', value: `${BASE_EV_EBIT}×` },
      { label: '合理 EV', value: yi(fairEv) },
      { label: netDebt >= 0 ? '− 净负债' : '＋ 净现金', value: yi(Math.abs(netDebt)) },
      { label: '− 少数股东权益', value: yi(minority) },
      { label: '= 股权价值', value: yi(equity) },
      { label: '÷ 总股本', value: `${shares} 亿股` },
      { label: '= 合理价值', value: `${fair} 元` },
    ],
  };
}

/** ③ 盈利能力法：合理价 = 常态EPS × 合理PE。 */
function earningsPowerMethod(m: FinancialMetrics): ValuationMethod {
  const shares = m.sharesYi ?? 0;
  const EARNINGS_YEARS = 2;
  const nps = m.annual.slice(-EARNINGS_YEARS).map((a) => a.netProfitYi).filter((v): v is number => v != null);
  if (!nps.length) return na('earnings-power', '缺少净利润数据');
  if (!(shares > 0)) return na('earnings-power', '缺少总股本');
  const npNorm = r2(mean(nps));
  if (!(npNorm > 0)) return na('earnings-power', `常态净利 ≤ 0（近${nps.length}年均 ${npNorm} 亿）`);
  const epsNorm = r2((npNorm * 1e8) / (shares * 1e8));
  const fair = r2(BASE_PE * epsNorm);
  return {
    id: 'earnings-power',
    name: METHOD_NAME['earnings-power'],
    applicable: true,
    fairValue: fair,
    strikePrice: strikeOf(fair),
    formula: `合理价 = 常态EPS × 合理PE ${BASE_PE}×`,
    rows: [
      { label: `常态归母净利（近${nps.length}年均）`, value: yi(npNorm) },
      { label: '÷ 总股本', value: `${shares} 亿股` },
      { label: '= 常态 EPS', value: `${epsNorm} 元` },
      { label: '× 合理 PE', value: `${BASE_PE}×` },
      { label: '= 合理价值', value: `${fair} 元` },
    ],
  };
}

/** ④ PS 法（盈利不确定时）：合理PS = 合理PE × 历史常态净利率；合理价 = 合理PS × 最近年营收 ÷ 总股本。 */
function psMethod(m: FinancialMetrics): ValuationMethod {
  const shares = m.sharesYi ?? 0;
  const margins = m.annual.map((a) => a.netMargin).filter((v): v is number => v != null).map((v) => v / 100);
  const revs = m.annual.map((a) => a.revenueYi).filter((v): v is number => v != null);
  if (!margins.length || !revs.length) return na('ps', '缺少营收 / 净利率数据');
  if (!(shares > 0)) return na('ps', '缺少总股本');
  const marginNorm = median(margins);
  if (!(marginNorm > 0)) return na('ps', '历史常态净利率 ≤ 0');
  const revenueLatest = revs[revs.length - 1];
  const fairPs = r2(BASE_PE * marginNorm);
  const fairMcap = r2(fairPs * revenueLatest);
  const fair = r2(fairMcap / shares);
  return {
    id: 'ps',
    name: METHOD_NAME.ps,
    applicable: true,
    fairValue: fair,
    strikePrice: strikeOf(fair),
    formula: `合理价 = (合理PE ${BASE_PE}× × 历史常态净利率 × 最近年营收) ÷ 总股本`,
    rows: [
      { label: '历史常态净利率（中位）', value: `${r2(marginNorm * 100)}%` },
      { label: `合理 PS = ${BASE_PE}× × 常态净利率`, value: `${fairPs}×` },
      { label: '最近年营收', value: yi(revenueLatest) },
      { label: '= 合理市值', value: yi(fairMcap) },
      { label: '÷ 总股本', value: `${shares} 亿股` },
      { label: '= 合理价值', value: `${fair} 元` },
    ],
  };
}

export interface ComputedValuation {
  methods: ValuationMethod[];
  medianFairValue: number | null;
  safetyMargin: number;
}

/** 由客观财务指标计算四种方法（顺序固定 ①②③④）。 */
export function computeValuation(m: FinancialMetrics): ComputedValuation {
  const methods = [dividendMethod(m), evEbitMethod(m), earningsPowerMethod(m), psMethod(m)];
  const fairs = methods.filter((x) => x.applicable && x.fairValue != null).map((x) => x.fairValue as number);
  const med = fairs.length ? r2(median(fairs)) : null;
  return { methods, medianFairValue: med, safetyMargin: SAFETY_MARGIN };
}
