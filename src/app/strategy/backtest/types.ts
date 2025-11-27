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
  yearlyDetails: Array<{
    year: string;
    startValue: number;
    endValue: number;
    startStockValue: number;
    endStockValue: number;
    stockBuyAmount: number;
    stockSellAmount: number;
    stockPriceChange: number;
    startIndexPrice: number;
    endIndexPrice: number;
    startBondValue: number;
    endBondValue: number;
    bondBuyAmount: number;
    bondSellAmount: number;
    bondInterest: number;
    return: number;
    trades: number;
  }>;
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
  yearlyDetails: Array<{
    year: string;
    startValue: number;
    endValue: number;
    stockValue?: number;
    return: number;
    interest?: number;
    investedAmount?: number;
    finalValue?: number;
  }>;
}

