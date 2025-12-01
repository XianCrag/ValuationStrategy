export interface StockData {
  date: string;
  marketValue?: number;
  pe_ttm?: number;
  [key: string]: any;
}

export interface ApiResponse {
  success: boolean;
  data: StockData[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
  error?: string;
}

export type MetricType = 'csi300-index' | 'csi300-fund' | 'a-stock-all' | 'interest' | 'erp' | 'individual-stock'; // csi300-index: 沪深300指数, csi300-fund: 沪深300基金, a-stock-all: A股全指, interest: 国债, erp: 股权风险溢价, individual-stock: 个股

export interface StockConfig {
  code: string;
  name: string;
  type: string;
}

