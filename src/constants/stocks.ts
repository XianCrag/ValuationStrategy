// ============================================
// 标的配置类型
// ============================================

export interface StockConfig {
  code: string;
  name: string;
  type: string;
  industry?: string; // 行业信息（仅个股）
}

// ============================================
// 标的配置
// ============================================

// 沪深300指数
export const CSI300_INDEX_STOCK: StockConfig = {
  code: '000300',
  name: '沪深300指数',
  type: 'index',
};

// 沪深300基金（华泰柏瑞沪深300ETF，使用复权净值数据）
export const CSI300_FUND_STOCK: StockConfig = {
  code: '510300',
  name: '沪深300ETF基金',
  type: 'fund',
};

// A股全指
export const A_STOCK_ALL_STOCK: StockConfig = {
  code: '1000002',
  name: 'A股全指',
  type: 'index',
};

// 10年期国债
export const NATIONAL_DEBT_STOCK: StockConfig = {
  code: 'tcm_y10',
  name: '10年期国债',
  type: 'interest',
};

// ============================================
// 个股配置
// ============================================

// 银行保险证券
export const BANK_OF_CHINA_STOCK: StockConfig = {
  code: '601988',
  name: '中国银行',
  type: 'stock',
  industry: '银行保险证券',
};

export const CMB_STOCK: StockConfig = {
  code: '600036',
  name: '招商银行',
  type: 'stock',
  industry: '银行保险证券',
};

export const CHENGDU_BANK_STOCK: StockConfig = {
  code: '601838',
  name: '成都银行',
  type: 'stock',
  industry: '银行保险证券',
};

export const HANGZHOU_BANK_STOCK: StockConfig = {
  code: '600926',
  name: '杭州银行',
  type: 'stock',
  industry: '银行保险证券',
};

export const BEIJING_BANK_STOCK: StockConfig = {
  code: '601169',
  name: '北京银行',
  type: 'stock',
  industry: '银行保险证券',
};

export const PING_AN_STOCK: StockConfig = {
  code: '601318',
  name: '中国平安',
  type: 'stock',
  industry: '银行保险证券',
};

// 能源行业
export const CHINA_SHENHUA_STOCK: StockConfig = {
  code: '601088',
  name: '中国神华',
  type: 'stock',
  industry: '能源行业',
};

export const COSCO_SHIPPING_STOCK: StockConfig = {
  code: '601919',
  name: '中远海控',
  type: 'stock',
  industry: '能源行业',
};

export const ZIJIN_MINING_STOCK: StockConfig = {
  code: '601899',
  name: '紫金矿业',
  type: 'stock',
  industry: '能源行业',
};

export const PETRO_CHINA_STOCK: StockConfig = {
  code: '601857',
  name: '中国石油',
  type: 'stock',
  industry: '能源行业',
};

export const CNOOC_STOCK: StockConfig = {
  code: '600938',
  name: '中国海洋',
  type: 'stock',
  industry: '能源行业',
};

export const CHINA_MOBILE_STOCK: StockConfig = {
  code: '600941',
  name: '中国移动',
  type: 'stock',
  industry: '能源行业',
};

// 消费行业
export const TSINGTAO_BEER_STOCK: StockConfig = {
  code: '600600',
  name: '青岛啤酒',
  type: 'stock',
  industry: '消费行业',
};

export const HAITIAN_STOCK: StockConfig = {
  code: '603288',
  name: '海天味业',
  type: 'stock',
  industry: '消费行业',
};

export const YILI_STOCK: StockConfig = {
  code: '600887',
  name: '伊利股份',
  type: 'stock',
  industry: '消费行业',
};

export const PROYA_STOCK: StockConfig = {
  code: '603605',
  name: '珀莱雅',
  type: 'stock',
  industry: '消费行业',
};

export const GREE_STOCK: StockConfig = {
  code: '000651',
  name: '格力电器',
  type: 'stock',
  industry: '消费行业',
};

// 新能源&汽车
export const BYD_STOCK: StockConfig = {
  code: '002594',
  name: '比亚迪',
  type: 'stock',
  industry: '新能源&汽车',
};

export const YUTONG_BUS_STOCK: StockConfig = {
  code: '600066',
  name: '宇通客车',
  type: 'stock',
  industry: '新能源&汽车',
};

export const CATL_STOCK: StockConfig = {
  code: '300750',
  name: '宁德时代',
  type: 'stock',
  industry: '新能源&汽车',
};

export const FUYAO_GLASS_STOCK: StockConfig = {
  code: '600660',
  name: '福耀玻璃',
  type: 'stock',
  industry: '新能源&汽车',
};

// 所有个股列表（便于导出和使用）
export const ALL_INDIVIDUAL_STOCKS: StockConfig[] = [
  // 银行保险证券
  BANK_OF_CHINA_STOCK,
  CMB_STOCK,
  CHENGDU_BANK_STOCK,
  HANGZHOU_BANK_STOCK,
  BEIJING_BANK_STOCK,
  PING_AN_STOCK,
  // 能源行业
  CHINA_SHENHUA_STOCK,
  COSCO_SHIPPING_STOCK,
  ZIJIN_MINING_STOCK,
  PETRO_CHINA_STOCK,
  CNOOC_STOCK,
  CHINA_MOBILE_STOCK,
  // 消费行业
  TSINGTAO_BEER_STOCK,
  HAITIAN_STOCK,
  YILI_STOCK,
  PROYA_STOCK,
  GREE_STOCK,
  // 新能源&汽车
  BYD_STOCK,
  YUTONG_BUS_STOCK,
  CATL_STOCK,
  FUYAO_GLASS_STOCK,
];

