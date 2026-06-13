/** 个股实时行情（来自 /api/stock-quote，数据源 a-stock-data Skill）。 */
export interface StockQuote {
  success: boolean;
  error?: string;
  code: string;
  name: string;
  price: number;
  lastClose: number;
  changeAmt: number;
  changePct: number;
  turnoverPct: number;
  peTtm: number;
  pb: number;
  mcapYi: number;
  floatMcapYi: number;
  source: string;
}

/** 击球区状态（§10 估值总结）。 */
export type StrikeZone = 'undervalued' | 'fair' | 'overvalued' | 'unknown';

/** 个股估值分析（来自 /api/stock-valuation）。 */
export interface StockValuation {
  success: boolean;
  error?: string;
  code: string;
  name: string;
  price: number;
  /** 腾讯实时 PE-TTM */
  peLive: number;
  /** PE 历史分位（0~100），null 表示数据不足 */
  pePercentile: number | null;
  /** 用 TTM EPS 自算的当前 PE（与分位口径一致） */
  peComputed: number | null;
  /** 历史分位回看窗口（年） */
  peWindowYears: number | null;
  /** 滚动 12 个月股息率（%） */
  dividendYield: number | null;
  /** 最近年度加权 ROE（%） */
  roe: number | null;
  /** ROE 对应年度 */
  roePeriod: string | null;
  /** 所属行业（东财） */
  industry?: string;
  strikeZone: StrikeZone;
  valuationError?: string;
  dividendError?: string;
}

/** 选股池条目（来自 /api/stock-pool，服务端快照）。 */
export interface PoolEntry {
  code: string;
  name: string;
  industry: string;
  price: number | null;
  peTtm: number | null;
  pePercentile: number | null;
  dividendYield: number | null;
  roe: number | null;
  roePeriod: string | null;
  strikeZone: StrikeZone;
  addedAt: string;
}
