/**
 * AH Price Service
 * 处理AH股票价格获取的业务逻辑
 */

import { AHStockPair } from '@/constants/ah-stocks';
import { AHPriceInfo } from './types';
import { getCandlestickData } from '@/lib/lixinger/candlestick';
import { getHKCandlestickData } from '@/lib/lixinger/hk-candlestick';

// 固定汇率：1 HKD = 0.9 CNY
// TODO: 接入实时汇率API
const EXCHANGE_RATE_HKD_TO_CNY = 0.9;

/**
 * 获取单个股票的AH价格数据
 * A股价格：使用理杏仁K线API获取真实数据
 * H股价格：使用理杏仁港股K线API获取真实数据
 */
export async function fetchAHPriceData(
  ahStock: AHStockPair,
  date?: string
): Promise<AHPriceInfo> {
  console.log(`  📈 获取 ${ahStock.name} (A:${ahStock.aCode}, H:${ahStock.hCode}) 的价格数据`);

  const today = date || new Date().toISOString().split('T')[0];

  try {
    // 1. 获取A股真实价格（使用理杏仁K线API）
    const aStockPrice = await fetchAStockPrice(ahStock.aCode, today);

    // 2. 获取H股真实价格（使用理杏仁港股K线API）
    const hStockPrice = await fetchHStockPrice(ahStock.hCode, today);

    // 3. 计算溢价（使用固定汇率）
    // 新口径：溢价率 = H/A - 1
    const hPriceInCNY = hStockPrice.price * EXCHANGE_RATE_HKD_TO_CNY;
    const premiumRate = ((hPriceInCNY / aStockPrice.price) - 1) * 100;
    const premiumAmount = aStockPrice.price - hPriceInCNY;

    const priceInfo: AHPriceInfo = {
      aStock: {
        code: ahStock.aCode,
        name: ahStock.name,
        price: aStockPrice.price,
        date: aStockPrice.date,
      },
      hStock: {
        code: ahStock.hCode,
        name: ahStock.name,
        price: hStockPrice.price,
        priceInCNY: hPriceInCNY,
        date: hStockPrice.date,
      },
      premium: {
        rate: premiumRate,
        amount: premiumAmount,
        type: premiumRate >= 0 ? 'positive' : 'negative',
      },
      industry: ahStock.industry,
      updatedAt: new Date().toISOString(),
    };

    console.log(`  ✅ ${ahStock.name}: A股¥${aStockPrice.price.toFixed(2)} (真实), H股HK$${hStockPrice.price.toFixed(2)}=¥${hPriceInCNY.toFixed(2)} (真实), 溢价${premiumRate.toFixed(2)}%`);

    return priceInfo;
  } catch (error) {
    console.error(`  ❌ 获取 ${ahStock.name} 失败:`, error);
    throw new Error(`获取 ${ahStock.name} 价格失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 批量获取多个股票的AH价格数据
 */
export async function fetchBatchAHPriceData(
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
  const { findByACode, findByHCode } = await import('@/constants/ah-stocks');

  const results: AHPriceInfo[] = [];
  let successCount = 0;
  let failedCount = 0;

  // 并发获取数据（最多10个并发）
  const batchSize = 10;
  for (let i = 0; i < stockCodes.length; i += batchSize) {
    const batch = stockCodes.slice(i, i + batchSize);

    const promises = batch.map(async (code) => {
      try {
        const ahStock = findByACode(code) || findByHCode(code);
        if (!ahStock) {
          console.warn(`  ⚠️  ${code} 不是AH股或未在系统中`);
          failedCount++;
          return null;
        }

        const priceInfo = await fetchAHPriceData(ahStock, date);
        successCount++;
        return priceInfo;
      } catch (error) {
        console.error(`  ❌ 获取 ${code} 失败:`, error);
        failedCount++;
        return null;
      }
    });

    const batchResults = await Promise.all(promises);
    results.push(...batchResults.filter((r): r is AHPriceInfo => r !== null));
  }

  console.log(`📊 批量获取完成: 成功 ${successCount}/${stockCodes.length}`);

  return {
    data: results,
    stats: {
      total: stockCodes.length,
      success: successCount,
      failed: failedCount,
    },
  };
}

/**
 * 获取A股价格（使用理杏仁K线API）
 */
async function fetchAStockPrice(
  stockCode: string,
  date?: string
): Promise<{ price: number; date: string }> {
  try {
    const today = date || new Date().toISOString().split('T')[0];

    // 如果指定了日期，获取该日期前后5天的数据（确保能获取到交易日数据）
    let startDate: string;
    let endDate: string;

    if (date) {
      const targetDate = new Date(date);
      const startDateObj = new Date(targetDate);
      startDateObj.setDate(startDateObj.getDate() - 5);
      const endDateObj = new Date(targetDate);
      endDateObj.setDate(endDateObj.getDate() + 5);

      startDate = startDateObj.toISOString().split('T')[0];
      endDate = endDateObj.toISOString().split('T')[0];
    } else {
      // 获取最近7天的数据，确保能获取到最新交易日
      const endDateObj = new Date();
      const startDateObj = new Date();
      startDateObj.setDate(startDateObj.getDate() - 7);

      startDate = startDateObj.toISOString().split('T')[0];
      endDate = endDateObj.toISOString().split('T')[0];
    }

    // 调用理杏仁K线API
    const candleData = await getCandlestickData(stockCode, startDate, endDate);

    if (!candleData || candleData.length === 0) {
      throw new Error(`未获取到股票 ${stockCode} 的K线数据`);
    }

    // 如果指定了日期，找最接近该日期的数据
    let targetData;
    if (date) {
      // 找到指定日期或之前最近的交易日数据
      targetData = candleData
        .filter(d => d.date <= date)
        .sort((a, b) => b.date.localeCompare(a.date))[0];

      if (!targetData) {
        // 如果没有之前的数据，取之后最近的
        targetData = candleData
          .filter(d => d.date >= date)
          .sort((a, b) => a.date.localeCompare(b.date))[0];
      }
    } else {
      // 取最新的数据
      targetData = candleData.sort((a, b) => b.date.localeCompare(a.date))[0];
    }

    if (!targetData) {
      throw new Error(`未找到股票 ${stockCode} 在 ${date || '最近'} 的数据`);
    }

    console.log(`    💰 A股 ${stockCode}: ¥${targetData.close.toFixed(2)} (${targetData.date})`);

    return {
      price: targetData.close,
      date: targetData.date,
    };
  } catch (error) {
    console.error(`    ❌ 获取A股 ${stockCode} 价格失败:`, error);
    throw error;
  }
}

/**
 * 获取H股价格（使用理杏仁港股K线API）
 */
async function fetchHStockPrice(
  stockCode: string,
  date?: string
): Promise<{ price: number; priceInCNY: number; date: string }> {
  try {
    const today = date || new Date().toISOString().split('T')[0];

    // 如果指定了日期，获取该日期前后5天的数据（确保能获取到交易日数据）
    let startDate: string;
    let endDate: string;

    if (date) {
      const targetDate = new Date(date);
      const startDateObj = new Date(targetDate);
      startDateObj.setDate(startDateObj.getDate() - 5);
      const endDateObj = new Date(targetDate);
      endDateObj.setDate(endDateObj.getDate() + 5);

      startDate = startDateObj.toISOString().split('T')[0];
      endDate = endDateObj.toISOString().split('T')[0];
    } else {
      // 获取最近7天的数据，确保能获取到最新交易日
      const endDateObj = new Date();
      const startDateObj = new Date();
      startDateObj.setDate(startDateObj.getDate() - 7);

      startDate = startDateObj.toISOString().split('T')[0];
      endDate = endDateObj.toISOString().split('T')[0];
    }

    // 调用理杏仁港股K线API
    const candleData = await getHKCandlestickData(stockCode, startDate, endDate);

    if (!candleData || candleData.length === 0) {
      throw new Error(`未获取到港股 ${stockCode} 的K线数据`);
    }

    // 如果指定了日期，找最接近该日期的数据
    let targetData;
    if (date) {
      // 找到指定日期或之前最近的交易日数据
      targetData = candleData
        .filter(d => d.date <= date)
        .sort((a, b) => b.date.localeCompare(a.date))[0];

      if (!targetData) {
        // 如果没有之前的数据，取之后最近的
        targetData = candleData
          .filter(d => d.date >= date)
          .sort((a, b) => a.date.localeCompare(b.date))[0];
      }
    } else {
      // 取最新的数据
      targetData = candleData.sort((a, b) => b.date.localeCompare(a.date))[0];
    }

    if (!targetData) {
      throw new Error(`未找到港股 ${stockCode} 在 ${date || '最近'} 的数据`);
    }

    console.log(`    💰 H股 ${stockCode}: HK$${targetData.close.toFixed(2)} (${targetData.date})`);

    return {
      price: targetData.close, // 港币价格
      priceInCNY: targetData.close / EXCHANGE_RATE_HKD_TO_CNY, // 人民币价格
      date: targetData.date,
    };
  } catch (error) {
    console.error(`    ❌ 获取H股 ${stockCode} 价格失败:`, error);
    throw error;
  }
}

// 移除不再需要的 fetchExchangeRate 函数

