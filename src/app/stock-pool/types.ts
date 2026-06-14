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

/** 收入/趋势方向，用于染色（涨红 / 平 / 跌绿，A股习惯）。 */
export type TrendDirection = 'up' | 'flat' | 'down';

/** 一条业务板块（业务模式分类表的一行）。 */
export interface BusinessSegment {
  /** 业务板块，如「自研游戏」 */
  name: string;
  /** 定位，如「核心主业」 */
  position: string;
  /** 特征描述 */
  features: string;
}

/** 一条收入来源（收入结构拆解表的一行）。 */
export interface RevenueSource {
  /** 收入来源，如「国内手游」 */
  source: string;
  /** 占比文本，如「~75%」（AI 估算，故保留文本而非精确数值） */
  share: string;
  /** 占比对应口径年份，如「2025」 */
  shareYear: string;
  /** 趋势描述，如「快速增长，同比+85.8%」 */
  trend: string;
  /** 趋势方向，用于染色 */
  trendDirection: TrendDirection;
}

/** 单一产品依赖度警示。 */
export interface ProductDependency {
  /** 前 N 大产品 */
  topN: number;
  /** 产品明细文本（含各自营收） */
  detail: string;
  /** 占营收比例文本，如「~72%」 */
  share: string;
  /** 风险定性结论 */
  note: string;
}

/**
 * 业务分析状态（与股票池对齐）：
 * - ready：已在池内且已离线生成分析
 * - pending：已在池内但分析尚未生成（等待跑脚本）
 * - not-in-pool：未加入股票池，不生成分析
 */
export type BusinessStatus = 'ready' | 'pending' | 'not-in-pool';

/** 业务分析生成方式：cursor-dev（开发期由 Cursor 离线生成）/ ai / mock。 */
export type GeneratedBy = 'cursor-dev' | 'ai' | 'mock';

/**
 * 业务分析（来自 /api/stock-business，对应 RRD_1.md §2）。
 *
 * 🟨 AI 定性主导：占比/趋势/依赖度由模型从财报、F10、研报解析，
 * 须带来源、置信度、生成时间，且不可作为唯一决策依据。
 *
 * 与股票池对齐：仅池内标的会生成分析（见 status）。开发期内容由 Cursor
 * 离线综合后写入 data/business/{code}.json，AI 接入后仅替换生成方式。
 */
export interface BusinessAnalysis {
  success: boolean;
  error?: string;
  code: string;
  name: string;
  /** 与股票池对齐的状态 */
  status: BusinessStatus;
  /** 是否在股票池内 */
  inPool: boolean;
  /** 业务模式分类（status=ready 时有值） */
  segments: BusinessSegment[];
  /** 收入结构拆解（status=ready 时有值） */
  revenues: RevenueSource[];
  /** 单一产品依赖度（可空，部分公司无明显单品依赖） */
  dependency: ProductDependency | null;
  /** 信息来源（如「2025 年报 / F10 / 研报」） */
  source: string;
  /** 置信度：high / medium / low */
  confidence: 'high' | 'medium' | 'low';
  /** 数据截止报告期（如「2025-12-31」），用于过期检测 */
  reportPeriod: string | null;
  /** 生成方式 */
  generatedBy: GeneratedBy;
  /** 生成时间（ISO 字符串），未生成时为 null */
  generatedAt: string | null;
}

/** 一年的财务序列点（周期分析图表用，客观数据）。 */
export interface CyclePoint {
  /** 年份，如「2024」 */
  year: string;
  /** 营业总收入（亿元） */
  revenue: number | null;
  /** 归母净利润（亿元） */
  netProfit: number | null;
  /** 营收同比（%） */
  revenueYoY: number | null;
  /** 归母净利同比（%） */
  netProfitYoY: number | null;
  /** 加权 ROE（%） */
  roe: number | null;
  /** 销售毛利率（%） */
  grossMargin: number | null;
  /** 销售净利率（%） */
  netMargin: number | null;
}

/** 周期性强度。 */
export type Cyclicality = 'strong' | 'moderate' | 'weak';

/** 当前所处周期阶段。 */
export type CyclePosition = 'trough' | 'rising' | 'peak' | 'falling' | 'unknown';

/**
 * 周期分析（来自 /api/stock-cycle，对应 RRD_1.md §4 周期性）。
 *
 * 🟦 客观序列（annual，近 ~10 年年报）+ 🟨 AI 判断（是否周期股 / 当前周期位置）。
 * 与股票池对齐：仅池内标的会生成（见 status）。开发期由 Cursor 基于
 * cycle_fetch.py 序列综合后写入 data/cycle/{code}.json。
 */
export interface CycleAnalysis {
  success: boolean;
  error?: string;
  code: string;
  name: string;
  status: BusinessStatus;
  inPool: boolean;
  /** 近 ~10 年年报财务序列（status=ready 时有值） */
  annual: CyclePoint[];
  /** 是否周期股 */
  isCyclical: boolean;
  /** 周期性强度 */
  cyclicality: Cyclicality;
  /** 当前周期阶段 */
  position: CyclePosition;
  /** 当前景气在历史周期中的相对位置：0（底部）~ 100（顶部），用于仪表盘 */
  positionScore: number | null;
  /** AI 论证（一段话） */
  summary: string;
  /** 周期驱动因素 */
  drivers: string[];
  source: string;
  confidence: 'high' | 'medium' | 'low';
  reportPeriod: string | null;
  generatedBy: GeneratedBy;
  generatedAt: string | null;
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
