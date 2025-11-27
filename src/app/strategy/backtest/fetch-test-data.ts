/**
 * 获取真实数据并保存到文件
 * 运行方式：npx tsx src/app/strategy/backtest/fetch-test-data.ts
 */

import fs from 'fs';
import path from 'path';
import { CSI300_FUND_CODE, DATA_YEARS } from './constants';

async function fetchRealData() {
  try {
    console.log('正在获取真实数据...\n');

    // 获取20年股票数据（API限制每次最多10年，需要分两次获取）
    const MAX_YEARS_PER_REQUEST = 10;
    const TOTAL_YEARS = DATA_YEARS;
    const batches = Math.ceil(TOTAL_YEARS / MAX_YEARS_PER_REQUEST);
    
    const allStockData: Array<{ date: string; cp?: number }> = [];
    
    for (let i = 0; i < batches; i++) {
      const yearsToFetch = Math.min(MAX_YEARS_PER_REQUEST, TOTAL_YEARS - i * MAX_YEARS_PER_REQUEST);
      
      console.log(`正在获取第 ${i + 1}/${batches} 批数据（${yearsToFetch}年）...`);
      
      const stockResponse = await fetch('http://localhost:3000/api/lixinger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stockCodes: [CSI300_FUND_CODE],
          codeTypeMap: { [CSI300_FUND_CODE]: 'fund' },
          years: yearsToFetch,
          metricsList: ['cp'], // 只需要收盘点位（基金使用净值）
        }),
      });

      if (!stockResponse.ok) {
        throw new Error(`HTTP error! status: ${stockResponse.status}`);
      }

      const stockResult = await stockResponse.json();

      if (!stockResult.success) {
        throw new Error(stockResult.error || 'Failed to fetch stock data');
      }

      const batchData = (stockResult.data as Array<{ date: string; cp?: number }>)
        .filter(item => item.cp !== undefined && item.cp !== null);
      
      allStockData.push(...batchData);
      console.log(`  获取到 ${batchData.length} 条数据`);
    }
    
    // 去重并排序
    const uniqueStockData = Array.from(
      new Map(allStockData.map(item => [item.date, item])).values()
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log(`\n总共获取到 ${uniqueStockData.length} 条股票数据（去重后）`);
    console.log(`日期范围：${uniqueStockData[0]?.date} 到 ${uniqueStockData[uniqueStockData.length - 1]?.date}`);

    // 保存到文件
    const testDataDir = path.join(process.cwd(), 'src/app/strategy/backtest');
    const testDataFile = path.join(testDataDir, 'test-data.json');

    const testData = {
      stockData: uniqueStockData,
      metadata: {
        fetchedAt: new Date().toISOString(),
        count: uniqueStockData.length,
        dateRange: {
          start: uniqueStockData[0]?.date,
          end: uniqueStockData[uniqueStockData.length - 1]?.date,
        },
      },
    };

    fs.writeFileSync(testDataFile, JSON.stringify(testData, null, 2), 'utf-8');

    console.log(`\n✅ 数据已保存到: ${testDataFile}`);
    console.log(`   数据条数: ${uniqueStockData.length}`);
    console.log(`   日期范围: ${uniqueStockData[0]?.date} 到 ${uniqueStockData[uniqueStockData.length - 1]?.date}`);

    return testData;
  } catch (error) {
    console.error('❌ 获取数据失败:', error);
    if (error instanceof Error) {
      console.error('错误信息:', error.message);
    }
    throw error;
  }
}

// 如果直接运行此文件
if (require.main === module) {
  fetchRealData()
    .then(() => {
      console.log('\n✅ 完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 失败！', error);
      process.exit(1);
    });
}

export { fetchRealData };

