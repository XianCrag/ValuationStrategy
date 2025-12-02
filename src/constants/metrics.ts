/**
 * Lixinger API 指标常量
 * 用于统一管理数据获取时使用的指标名称
 */

// ============================================
// 通用指标
// ============================================

/** 收盘价格 / 收盘点位 */
export const METRIC_CP = 'cp';

/** 股票价格（个股专用） */
export const METRIC_SP = 'sp';

/** 市值 */
export const METRIC_MC = 'mc';

// ============================================
// PE 相关指标
// ============================================

/** PE TTM (市值加权) */
export const METRIC_PE_TTM_MCW = 'pe_ttm.mcw';

/** PE TTM (10年历史百分位，市值加权) */
export const METRIC_PE_TTM_Y10_MCW_CVPOS = 'pe_ttm.y10.mcw.cvpos';

// ============================================
// 国债相关指标
// ============================================

/** 10年期国债收益率 */
export const METRIC_TCM_Y10 = 'tcm_y10';

// ============================================
// 指标组合（常用场景）
// ============================================

/** 指数完整数据：PE + 价格 + 市值 */
export const INDEX_FULL_METRICS = [METRIC_PE_TTM_MCW, METRIC_CP, METRIC_MC] as const;

/** 基金净值数据：累计净值（复权） */
export const FUND_NET_VALUE_METRICS = [METRIC_CP] as const;

/** @deprecated 使用 FUND_NET_VALUE_METRICS 代替 */
export const PRICE_ONLY_METRICS = FUND_NET_VALUE_METRICS;

/**
 * 国债利率数据：10年期国债收益率
 * 
 * 注意：这是默认的国债指标配置
 * 实际使用时，用户需要通过 nationalDebtCodes 参数明确指定需要的国债指标
 * 如 ['tcm_y10'] (10年期) 或 ['tcm_y5'] (5年期) 等
 */
export const NATIONAL_DEBT_METRICS = [METRIC_TCM_Y10] as const;

/** 指标页面使用的指标组合 */
export const INDICATOR_PAGE_METRICS = [METRIC_PE_TTM_MCW, METRIC_CP, METRIC_MC] as const;

// ============================================
// 个股相关指标
// ============================================

/** PE TTM（个股） */
export const METRIC_PE_TTM = 'pe_ttm';

/** 股息率（个股） */
export const METRIC_DYR = 'dyr';

/**
 * 个股完整数据：股票价格 + PE + 市值 + 股息率
 * 
 * 包含个股回测和分析所需的所有核心指标
 */
export const INDIVIDUAL_STOCK_METRICS = [METRIC_PE_TTM, METRIC_MC, METRIC_DYR] as const;
