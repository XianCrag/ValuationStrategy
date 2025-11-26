/**
 * Lixinger API Types
 * 理杏仁开放API类型定义
 */

export interface LixingerNonFinancialData {
  date: string;
  mc?: number; // 市值 (Market Cap)
  pe_ttm?: number; // PE TTM
  [key: string]: any;
}

export interface LixingerApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

export interface LixingerNonFinancialRequest {
  stockCodes: string[];
  startDate: string;
  endDate: string;
  metricsList?: string[];
  token: string;
}

export interface LixingerIndexFundamentalRequest {
  stockCodes: string[];
  startDate: string;
  endDate: string;
  metricsList?: string[];
  token: string;
}

