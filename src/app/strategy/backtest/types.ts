export interface StockData {
  date: string;
  pe_ttm?: number;
  cp?: number; // 收盘点位
  mc?: number; // 市值
  [key: string]: any;
}

export interface BondData {
  date: string;
  tcm_y10?: number;
  [key: string]: any;
}

export interface ApiResponse {
  success: boolean;
  data: (StockData | BondData)[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
  error?: string;
}

export interface TradePoint {
  date: string;
  type: 'buy' | 'sell';
  stockRatio: number;
  bondRatio: number;
  totalValue: number;
  stockValue: number;
  bondValue: number;
  changePercent: number;
  annualizedReturn: number;
}

export interface DailyStrategyState {
  date: string;
  stockRatio: number;
  bondRatio: number;
  stockValue: number;
  bondValue: number;
  totalValue: number;
  changePercent: number;
  annualizedReturn: number;
}

export interface StrategyResult {
  trades: TradePoint[];
  dailyStates: DailyStrategyState[];
  finalValue: number;
  totalReturn: number;
  annualizedReturn: number;
  finalStockRatio: number;
  maxDrawdown: number;
  yearlyDetails: YearlyDetail[];
}

/**
 * 股票持仓详情
 */
export interface StockPosition {
  code: string; // 股票代码
  shares: number; // 份额
  value: number; // 市值
  price: number; // 价格
}

/**
 * 统一的年度详情数据结构
 * 包含年度的股票和现金数据变化
 */
export interface YearlyDetail {
  year: string;
  // 基础数据
  startValue: number;
  endValue: number;
  return: number;
  
  // 股票相关数据（支持多个股票）
  startStockValue?: number;
  endStockValue?: number;
  startStockPositions?: StockPosition[]; // 年初持仓
  endStockPositions?: StockPosition[]; // 年末持仓
  stockValue?: number; // 年末股票价值（兼容旧格式）
  stockBuyAmount?: number;
  stockSellAmount?: number;
  stockPriceChange?: number;
  startIndexPrice?: number;
  endIndexPrice?: number;
  investedAmount?: number; // 定投金额
  
  // 现金/债券相关数据
  startCash?: number;
  endCash?: number;
  startBondValue?: number;
  endBondValue?: number;
  bondBuyAmount?: number;
  bondSellAmount?: number;
  bondInterest?: number;
  interest?: number; // 利息（兼容旧格式）
  cashInterest?: number; // 现金利息
  
  // 其他
  trades?: number; // 交易次数
  finalValue?: number; // 最终价值（兼容旧格式）
}

export interface ControlGroupResult {
  finalValue: number;
  totalReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
  dailyValues: Array<{
    date: string;
    value: number;
    changePercent: number;
  }>;
  yearlyDetails: YearlyDetail[];
}

