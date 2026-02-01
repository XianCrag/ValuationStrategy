/**
 * AH Price API Client
 * 客户端调用AH价格API的工具函数
 */

import {
    GetAHPriceResponse,
    GetBatchAHPriceResponse,
    AHPriceInfo,
} from './types';

/**
 * 获取单个股票的AH价格和溢价
 * @param stockCode A股或H股代码
 * @param date 可选日期 YYYY-MM-DD
 * @returns AH价格信息
 */
export async function getAHPrice(
    stockCode: string,
    date?: string
): Promise<AHPriceInfo> {
    const params = new URLSearchParams({ stockCode });
    if (date) params.append('date', date);

    const response = await fetch(`/api/ah-price?${params.toString()}`);
    const result: GetAHPriceResponse = await response.json();

    if (!result.success || !result.data) {
        throw new Error(result.error || '获取AH价格失败');
    }

    return result.data;
}

/**
 * 批量获取多个股票的AH价格和溢价
 * @param stockCodes 股票代码数组
 * @param date 可选日期
 * @returns AH价格信息数组和统计
 */
export async function getBatchAHPrice(
    stockCodes: string[],
    date?: string
): Promise<{
    data: AHPriceInfo[];
    stats: {
        total: number;
        success: number;
        failed: number;
    };
}> {
    const response = await fetch('/api/ah-price', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stockCodes, date }),
    });

    const result: GetBatchAHPriceResponse = await response.json();

    if (!result.success || !result.data) {
        throw new Error(result.error || '批量获取AH价格失败');
    }

    return {
        data: result.data,
        stats: result.stats!,
    };
}

/**
 * 获取所有AH股票的价格（分批处理）
 * @param allStockCodes 所有股票代码
 * @param batchSize 每批处理数量，默认50
 * @param onProgress 进度回调
 */
export async function getAllAHPrices(
    allStockCodes: string[],
    batchSize: number = 50,
    onProgress?: (current: number, total: number) => void
): Promise<AHPriceInfo[]> {
    const allResults: AHPriceInfo[] = [];
    const totalBatches = Math.ceil(allStockCodes.length / batchSize);

    for (let i = 0; i < totalBatches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, allStockCodes.length);
        const batch = allStockCodes.slice(start, end);

        console.log(`获取批次 ${i + 1}/${totalBatches}: ${batch.length} 个股票`);

        const { data } = await getBatchAHPrice(batch);
        allResults.push(...data);

        if (onProgress) {
            onProgress(end, allStockCodes.length);
        }

        // 避免请求过快，添加延迟
        if (i < totalBatches - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    return allResults;
}

