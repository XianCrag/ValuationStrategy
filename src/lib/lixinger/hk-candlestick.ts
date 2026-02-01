/**
 * 港股K线数据获取
 * 理杏仁港股API
 */

import { fetchLixingerData } from './utils';

/**
 * 港股K线数据类型
 */
export interface HKCandlestickData {
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
 * 港股K线数据响应
 */
interface HKCandlestickResponse {
    code: number;
    message: string;
    data: HKCandlestickData[];
}

/**
 * 获取港股K线数据（前复权）
 * @param stockCode 港股代码（如：03988）
 * @param startDate 开始日期 YYYY-MM-DD
 * @param endDate 结束日期 YYYY-MM-DD
 * @param type K线类型，默认为 'lxr_fc_rights' (前复权)
 * @returns 港股K线数据数组
 */
export async function getHKCandlestickData(
    stockCode: string,
    startDate: string,
    endDate: string,
    type: 'lxr_fc_rights' | 'original' | 'lxr_bc_rights' = 'lxr_fc_rights'
): Promise<HKCandlestickData[]> {
    const response = await fetchLixingerData<HKCandlestickResponse>(
        'https://open.lixinger.com/api/hk/company/candlestick',
        {
            stockCode,
            startDate,
            endDate,
            type,
        }
    );

    if (response.code !== 1) {
        throw new Error(`Failed to fetch HK candlestick data: ${response.message}`);
    }

    return response.data || [];
}

/**
 * 批量获取多个港股的K线数据
 * @param stockCodes 港股代码数组
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 按股票代码分组的K线数据
 */
export async function getBatchHKCandlestickData(
    stockCodes: string[],
    startDate: string,
    endDate: string
): Promise<Map<string, HKCandlestickData[]>> {
    const results = new Map<string, HKCandlestickData[]>();

    // 并行请求所有港股的K线数据
    const promises = stockCodes.map(async (code) => {
        try {
            const data = await getHKCandlestickData(code, startDate, endDate);
            results.set(code, data);
        } catch (error) {
            console.error(`Failed to fetch HK candlestick data for ${code}:`, error);
            results.set(code, []);
        }
    });

    await Promise.all(promises);
    return results;
}

