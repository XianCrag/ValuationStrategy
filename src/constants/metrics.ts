/**
 * Lixinger API 指标常量
 * 用于统一管理数据获取时使用的指标名称
 */

// ============================================
// 通用指标
// ============================================

/** 收盘价格 / 收盘点位 */
export const METRIC_CP = 'cp';

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

/** 基金/股票价格数据：仅收盘价 */
export const PRICE_ONLY_METRICS = [METRIC_CP] as const;

/** 国债利率数据 */
export const NATIONAL_DEBT_METRICS = [METRIC_TCM_Y10] as const;

/** 指标页面使用的指标组合 */
export const INDICATOR_PAGE_METRICS = [METRIC_PE_TTM_MCW, METRIC_CP, METRIC_MC] as const;

