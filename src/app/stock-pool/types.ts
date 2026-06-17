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
  /** 年度收盘价（不复权，元），用于「股价周期」对比；缺失为 null */
  priceClose?: number | null;
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

/** 一年的股东回报序列点。 */
export interface ShareholderPoint {
  /** 年份 */
  year: string;
  /** 当年现金分红总额（亿元），0 表示当年未分红，null 表示缺数据 */
  dividend: number | null;
  /** 归母净利润（亿元） */
  netProfit: number | null;
  /** 营业总收入（亿元） */
  revenue: number | null;
  /** 派息比例 = 分红 / 归母净利（%） */
  payoutRatio: number | null;
}

/** 股东回报力度评级。 */
export type ShareholderRating = 'strong' | 'moderate' | 'weak';

/**
 * 股东回报分析（来自 /api/stock-shareholder，对应 RRD_1.md §6）。
 *
 * 考察「分红 / 回购」与「市值、收入」的关系：股息率、派息比例、累计分红/市值、
 * 分红/收入、连续分红年数等。🟦 序列与比率为客观计算（shareholder_fetch.py），
 * 🟨 回购说明与评价由 Cursor 综合。与股票池对齐，仅池内标的生成。
 */
export interface ShareholderAnalysis {
  success: boolean;
  error?: string;
  code: string;
  name: string;
  status: BusinessStatus;
  inPool: boolean;
  /** 历年股东回报序列（status=ready 时有值） */
  annual: ShareholderPoint[];
  /** 生成时总市值（亿元，作为各比率分母的快照） */
  mcapYi: number | null;
  /** 当前股息率 = 最新年度分红 / 市值（%） */
  currentDividendYield: number | null;
  /** 最新派息比例（%） */
  payoutRatioLatest: number | null;
  /** 连续现金分红年数 */
  consecutiveYears: number | null;
  /** 累计现金分红（亿元） */
  cumulativeDividend: number | null;
  /** 累计分红 / 当前市值（%） */
  cumulativeToMcap: number | null;
  /** 最新年度分红 / 营业收入（%） */
  dividendToRevenue: number | null;
  /** 回购情况定性说明（🟨 AI，A 股无统一回购数据接口） */
  buybackNote: string;
  /** 股东回报力度评级 */
  rating: ShareholderRating;
  /** AI 论证 */
  summary: string;
  source: string;
  confidence: 'high' | 'medium' | 'low';
  reportPeriod: string | null;
  generatedBy: GeneratedBy;
  generatedAt: string | null;
}

/** 政策环境立场（顺风 / 中性 / 逆风）。 */
export type PolicyStance = 'tailwind' | 'neutral' | 'headwind';

/** 单条政策影响方向。 */
export type PolicyImpact = 'positive' | 'neutral' | 'negative';

/** 一条政策事件（时间线的一行）。 */
export interface PolicyEvent {
  /** 时间，如「2024-04」或「2025 年」 */
  date: string;
  /** 事件标题 */
  title: string;
  /** 对公司 / 行业的影响方向 */
  impact: PolicyImpact;
  /** 影响说明 */
  note: string;
}

/**
 * 政策、监管环境分析（来自 /api/stock-policy，对应 RRD_1.md §7）。
 *
 * 🟨 纯 AI 定性：识别行业政策顺风/逆风与监管风险。与股票池对齐，仅池内标的生成；
 * 开发期由 Cursor 综合（财报/政策文件/新闻）后写入 data/policy/{code}.json。
 */
export interface PolicyAnalysis {
  success: boolean;
  error?: string;
  code: string;
  name: string;
  status: BusinessStatus;
  inPool: boolean;
  /** 总体政策立场 */
  stance: PolicyStance;
  /** AI 论证（一段话） */
  summary: string;
  /** 关键政策事件时间线 */
  events: PolicyEvent[];
  /** 监管 / 政策风险点 */
  risks: string[];
  source: string;
  confidence: 'high' | 'medium' | 'low';
  reportPeriod: string | null;
  generatedBy: GeneratedBy;
  generatedAt: string | null;
}

/** 护城河整体强度（宽 / 中 / 窄）。 */
export type MoatStrength = 'wide' | 'moderate' | 'narrow';

/** 护城河单维度评分（雷达图一个顶点）。 */
export interface MoatDimension {
  /** 维度名，如「成本优势」 */
  name: string;
  /** 评分 0~5 */
  score: number;
  /** 评分依据 */
  note: string;
}

/** 竞争对手对比要点。 */
export interface CompetitorPoint {
  /** 对手名称 */
  name: string;
  /** 对比要点 */
  note: string;
}

/**
 * 市场竞争力 / 护城河 / 技术创新分析（来自 /api/stock-moat，对应 RRD_1.md §8）。
 *
 * 🟨 AI 定性主导：成本优势 / 网络效应 / 无形资产 / 转换成本 / 规模效应五维评分，
 * 佐证可结合研发数据。与股票池对齐，仅池内标的生成；开发期由 Cursor 写入
 * data/moat/{code}.json。
 */
export interface MoatAnalysis {
  success: boolean;
  error?: string;
  code: string;
  name: string;
  status: BusinessStatus;
  inPool: boolean;
  /** 护城河整体强度 */
  strength: MoatStrength;
  /** 五维护城河评分（雷达图） */
  dimensions: MoatDimension[];
  /** AI 论证（一段话） */
  summary: string;
  /** 主要竞争对手对比要点 */
  competitors: CompetitorPoint[];
  source: string;
  confidence: 'high' | 'medium' | 'low';
  reportPeriod: string | null;
  generatedBy: GeneratedBy;
  generatedAt: string | null;
}

/** 一年的海外收入序列点（🟦 来自 globalization_fetch.py，按地区主营构成）。 */
export interface GlobalizationPoint {
  /** 年份 */
  year: string;
  /** 当年主营总收入（亿元） */
  totalRevenue: number | null;
  /** 当年海外 / 境外主营收入（亿元），null 表示无分地区披露 */
  overseasIncome: number | null;
  /** 海外收入占主营比例（%） */
  overseasRatio: number | null;
}

/** 一条分地区收入明细（最新年度）。 */
export interface RegionShare {
  /** 地区名，如「境内」「境外」 */
  name: string;
  /** 主营收入（亿元） */
  income: number | null;
  /** 占主营比例（%） */
  ratio: number | null;
  /** 毛利率（%），常缺失 */
  grossMargin: number | null;
}

/**
 * 全球化、出海分析（来自 /api/stock-globalization，对应 RRD_1.md §9）。
 *
 * 🟦 海外收入序列与分地区拆分客观计算（globalization_fetch.py，东财主营构成·按地区）
 * + 🟨 AI 判断（出海市场、地缘/汇率风险、海外竞争）。与股票池对齐，仅池内标的生成。
 */
export interface GlobalizationAnalysis {
  success: boolean;
  error?: string;
  code: string;
  name: string;
  status: BusinessStatus;
  inPool: boolean;
  /** 历年海外收入序列（status=ready 时有值） */
  annual: GlobalizationPoint[];
  /** 最新披露年度 */
  latestYear: string | null;
  /** 最新年度分地区拆分明细 */
  latestBreakdown: RegionShare[];
  /** 主要出海市场（🟨 AI） */
  markets: string[];
  /** 出海机会要点（🟨 AI） */
  opportunities: string[];
  /** 出海风险要点：地缘 / 汇率 / 竞争（🟨 AI） */
  risks: string[];
  /** AI 论证（一段话） */
  summary: string;
  source: string;
  confidence: 'high' | 'medium' | 'low';
  reportPeriod: string | null;
  generatedBy: GeneratedBy;
  generatedAt: string | null;
}

/** 三维评分维度标识：稳定性 / 成长性 / 周期性。 */
export type ScoreDimensionId = 'stability' | 'growth' | 'cyclicality';

/**
 * 评分子项（维度下的一个考察点，对应 PRD_0.md「击球区」三方面拆解）。
 * score 0~5；口径统一为「越高越有利于价值投资」。
 */
export interface ScoreFactor {
  /** 子项名，如「商业模式 + 护城河」 */
  name: string;
  /** 评分 0~5 */
  score: number;
  /** 评分依据 */
  note: string;
}

/**
 * 一个评分维度（稳定性 / 成长性 / 周期性）。
 *
 * 口径统一为「分数越高越好（越利于价值投资）」：
 * - 稳定性：越高越稳健；
 * - 成长性：越高成长性越强；
 * - 周期性：越高代表周期性越弱 / 穿越周期确定性越强（强周期股得低分）。
 */
export interface ScoreDimension {
  id: ScoreDimensionId;
  /** 维度名，如「稳定性」 */
  name: string;
  /** 维度综合分 0~5（子项加权 / 平均） */
  score: number;
  /** 维度小结 */
  summary: string;
  /** 子项评分（逐条） */
  factors: ScoreFactor[];
}

/**
 * 企业综合评分（来自 /api/stock-scorecard，对应 PRD_0.md「击球区」三方面）。
 *
 * 置于估值分析之前：在「值多少钱」之前，先用三维评分判断「是一家什么样的公司」。
 * 🟨 AI 定性主导（结合护城河 / 周期 / 股东回报 / 财务等模块），与股票池对齐，
 * 仅池内标的生成；开发期由 Cursor 综合后写入 data/scorecard/{code}.json。
 */
export interface ScorecardAnalysis {
  success: boolean;
  error?: string;
  code: string;
  name: string;
  status: BusinessStatus;
  inPool: boolean;
  /** 三个维度（稳定性 / 成长性 / 周期性） */
  dimensions: ScoreDimension[];
  /** 综合评分 0~5（三维加权 / 平均） */
  overallScore: number | null;
  /** 企业画像标签，如「稳健高分红 · 类债周期龙头」 */
  profileTag: string;
  /** 总评（一段话） */
  summary: string;
  source: string;
  confidence: 'high' | 'medium' | 'low';
  reportPeriod: string | null;
  generatedBy: GeneratedBy;
  generatedAt: string | null;
}

/** 估值方法标识：①股息率 / ②EV/EBIT 倍数（替代 FCF 折现）/ ③未来盈利能力 / ④PS 市销率。 */
export type ValuationMethodId = 'dividend' | 'dcf' | 'earnings-power' | 'ps';

/**
 * EV/EBIT 倍数估值的测算明细（② 号方法的核心算法，替代 FCF×(1+g)/(r−g) 折现）。
 *
 * EV/EBIT 资本结构中性、对周期性重资产企业比 PE 更可比，且不依赖难以证伪的折现率 /
 * 永续增长假设。估值桥：
 *   合理 EV   = 合理倍数 × 常态 EBIT
 *   股权价值  = 合理 EV − 净负债 − 少数股东权益
 *   合理价值/股 = 股权价值 ÷ 总股本   →  写入 ValuationMethod.fairValue
 *
 * 🟦 EBIT / 净负债 / 少数股东权益 / 当前倍数由 ev_ebit_fetch.py 提供；
 * 🟨 常态 EBIT 与合理倍数由 Cursor 按周期与行业综合判断。
 */
export interface EvEbitValuation {
  /** 选用的合理 EV/EBIT 倍数（行业中枢 / 周期调整后） */
  fairMultiple: number;
  /** 常态 / 中周期 EBIT（亿元，利润总额 + 利息费用口径） */
  ebitYi: number;
  /** EBIT 口径说明（如「中周期常态」「2025 年报」「TTM 截至 …」） */
  ebitBasis: string;
  /** 合理 EV = 合理倍数 × 常态 EBIT（亿元） */
  fairEvYi: number;
  /** 净负债（亿元，负值表示净现金，估值时回加） */
  netDebtYi: number;
  /** 少数股东权益（亿元，EBIT 为合并口径，估值时扣减） */
  minorityYi: number;
  /** 总股本（亿股） */
  sharesYi: number;
  /** 当前股价对应的 EV/EBIT（倍，仅作参考对照） */
  currentMultiple: number;
}

/**
 * PS（市销率）估值测算明细（④ 号方法）。
 *
 * 适用「盈利能力不确定」的公司（盈利在盈亏线波动、PE/EBIT 失真），用营收锚定价值：
 *   合理市值 = 合理 PS × 常态营收
 *   合理价值/股 = 合理市值 ÷ 总股本   →  写入 ValuationMethod.fairValue
 * PS 为股权口径（市值/营收），不再扣减净负债。
 *
 * 🟦 营收 / 当前 PS 由取数脚本提供；🟨 合理 PS 与常态营收由 Cursor 按行业与前景判断。
 */
export interface PsValuation {
  /** 选用的合理 PS（市销率，倍） */
  fairPs: number;
  /** 常态 / 前瞻营收（亿元） */
  revenueYi: number;
  /** 营收口径说明（如「前瞻常态」「2025 年报」「TTM」） */
  revenueBasis: string;
  /** 总股本（亿股） */
  sharesYi: number;
  /** 当前股价对应的 PS（倍，仅作参考对照） */
  currentPs: number;
}

/**
 * 一种估值方法的结果（§10 估值方法之一）。
 *
 * fairValue 为合理价值（每股，元，固定单点值）。
 */
export interface ValuationMethod {
  id: ValuationMethodId;
  /** 方法名，如「股息率估值」 */
  name: string;
  /** 是否适用该公司 */
  applicable: boolean;
  /** 适用性说明（为何适用 / 不适用） */
  applicability: string;
  /** 合理价值（每股，元，固定单点值） */
  fairValue: number | null;
  /** 关键假设（逐条） */
  assumptions: string[];
  /** EV/EBIT 倍数估值测算明细（仅 ② 号方法提供） */
  evEbit?: EvEbitValuation | null;
  /** PS 市销率估值测算明细（仅 ④ 号方法提供） */
  ps?: PsValuation | null;
}

/**
 * 估值总结（来自 /api/stock-valuation-summary，对应 RRD_1.md §10）。⭐核心输出
 *
 * 以「内在价值」为锚：三种估值方法（每家至少①②，符合③特征再加③）→ AI 推荐主方法
 * → 击球价 = 推荐合理价值 ×（1 − 安全边际）。PE/股息率历史分位仅作参考，不作结论。
 *
 * 🟦 客观锚点由 valuation_fetch.py 提供（现价/股本/FCF/EPS/分红），🟨 各方法假设、
 * 推荐、安全边际与多空逻辑由 Cursor 综合后写入 data/valuation/{code}.json。
 */
export interface ValuationSummary {
  success: boolean;
  error?: string;
  code: string;
  name: string;
  status: BusinessStatus;
  inPool: boolean;
  /** 三种估值方法（不适用的也返回，applicable=false 并置灰） */
  methods: ValuationMethod[];
  /** AI 推荐主用的方法 */
  recommendedMethod: ValuationMethodId;
  /** 推荐理由 */
  recommendationReason: string;
  /** 推荐方法的合理价值（每股，元，固定单点值），用于击球区计算 */
  fairValue: number | null;
  /** 安全边际（0~1，如 0.25 表示 25%） */
  safetyMargin: number;
  /** 击球价 = 合理价值 ×（1 − 安全边际） */
  strikePrice: number | null;
  /** 生成时的现价快照（线上无实时价时用作信号灯回退） */
  snapshotPrice: number | null;
  /** 看多逻辑（3~5 条，综合各模块） */
  bullPoints: string[];
  /** 看空逻辑（3~5 条，综合各模块） */
  bearPoints: string[];
  /** PE 历史分位（仅参考，不作结论） */
  pePercentile: number | null;
  /** 滚动股息率（%，仅参考） */
  dividendYield: number | null;
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
