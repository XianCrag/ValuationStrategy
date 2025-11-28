// ============================================
// 标的配置类型
// ============================================

export interface StockConfig {
  code: string;
  name: string;
  type: string;
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

