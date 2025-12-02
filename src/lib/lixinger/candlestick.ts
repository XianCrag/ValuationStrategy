import { fetchLixingerData } from './utils';

/**
 * K线数据类型
 */
export interface CandlestickData {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  amount: number;
  change: number;
  stockCode: string;
  to_r?: number;
}

/**
 * K线数据响应
 */
interface CandlestickResponse {
  code: number;
  message: string;
  data: CandlestickData[];
}

/**
 * 获取股票K线数据（前复权）
 * @param stockCode 股票代码
 * @param startDate 开始日期 YYYY-MM-DD
 * @param endDate 结束日期 YYYY-MM-DD
 * @param type K线类型，默认为 'lxr_fc_rights' (前复权)
 * @returns K线数据数组
 */
export async function getCandlestickData(
  stockCode: string,
  startDate: string,
  endDate: string,
  type: 'lxr_fc_rights' | 'original' | 'lxr_bc_rights' = 'lxr_fc_rights'
): Promise<CandlestickData[]> {
  const response = await fetchLixingerData<CandlestickResponse>(
    'https://open.lixinger.com/api/cn/company/candlestick',
    {
      stockCode,
      startDate,
      endDate,
      type,
    }
  );

  if (response.code !== 1) {
    throw new Error(`Failed to fetch candlestick data: ${response.message}`);
  }

  return response.data || [];
}

/**
 * 批量获取多个股票的K线数据
 * @param stockCodes 股票代码数组
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 按股票代码分组的K线数据
 */
export async function getBatchCandlestickData(
  stockCodes: string[],
  startDate: string,
  endDate: string
): Promise<Map<string, CandlestickData[]>> {
  const results = new Map<string, CandlestickData[]>();

  // 并行请求所有股票的K线数据
  const promises = stockCodes.map(async (code) => {
    try {
      const data = await getCandlestickData(code, startDate, endDate);
      results.set(code, data);
    } catch (error) {
      console.error(`Failed to fetch candlestick data for ${code}:`, error);
      results.set(code, []);
    }
  });

  await Promise.all(promises);
  return results;
}

