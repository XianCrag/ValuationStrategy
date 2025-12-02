/**
 * API 调用工具函数
 * 封装跨页面的公共 API 请求逻辑
 */

import { StockData, BondData } from '@/app/backtest/types';

/**
 * API 响应接口
 */
export interface ApiResponse<T = StockData | BondData> {
  success: boolean;
  data: T[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
  error?: string;
}

/**
 * Lixinger API 请求参数
 */
export interface LixingerApiParams {
  /** 股票/指数/基金代码列表 */
  stockCodes?: string[];
  /** 代码类型映射 */
  codeTypeMap?: Record<string, 'stock' | 'index' | 'fund'>;
  /** 国债代码列表 */
  nationalDebtCodes?: string[];
  /** 查询年限 */
  years: number;
  /** 指标列表 - 已废弃，保留用于向后兼容，API 会根据 codeTypeMap 自动选择 */
  metricsList?: readonly string[] | string[];
}

/**
 * 调用 Lixinger API 获取数据
 * @param params API 请求参数
 * @returns 返回数据数组
 * @throws 当请求失败或返回错误时抛出异常
 */
export async function fetchLixingerData<T = StockData>(
  params: LixingerApiParams
): Promise<T[]> {
  const response = await fetch('/api/lixinger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result: ApiResponse<T> = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch data from Lixinger API');
  }

  return result.data;
}

