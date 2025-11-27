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

export type MetricType = 'index' | 'interest'; // interest 现在代表国债

export interface StockConfig {
  code: string;
  name: string;
  type: string;
}

