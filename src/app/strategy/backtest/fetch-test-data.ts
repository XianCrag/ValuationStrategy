/**
 * 获取真实数据并保存到文件
 * 运行方式：npx tsx src/app/strategy/backtest/fetch-test-data.ts
 */

import fs from 'fs';
import path from 'path';

async function fetchRealData() {
  try {
    console.log('正在获取真实数据...\n');

    // 获取股票数据（沪深300）
    const stockResponse = await fetch('http://localhost:3000/api/lixinger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stockCodes: ['000300'],
        codeTypeMap: { '000300': 'index' },
        years: 10,
        metricsList: ['cp'], // 只需要收盘点位
      }),
    });

    if (!stockResponse.ok) {
      throw new Error(`HTTP error! status: ${stockResponse.status}`);
    }

    const stockResult = await stockResponse.json();

    if (!stockResult.success) {
      throw new Error(stockResult.error || 'Failed to fetch stock data');
    }

    const stockData = (stockResult.data as Array<{ date: string; cp?: number }>)
      .filter(item => item.cp !== undefined && item.cp !== null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log(`获取到 ${stockData.length} 条股票数据`);
    console.log(`日期范围：${stockData[0]?.date} 到 ${stockData[stockData.length - 1]?.date}`);

    // 保存到文件
    const testDataDir = path.join(process.cwd(), 'src/app/strategy/backtest');
    const testDataFile = path.join(testDataDir, 'test-data.json');

    const testData = {
      stockData: stockData,
      metadata: {
        fetchedAt: new Date().toISOString(),
        count: stockData.length,
        dateRange: {
          start: stockData[0]?.date,
          end: stockData[stockData.length - 1]?.date,
        },
      },
    };

    fs.writeFileSync(testDataFile, JSON.stringify(testData, null, 2), 'utf-8');

    console.log(`\n✅ 数据已保存到: ${testDataFile}`);
    console.log(`   数据条数: ${stockData.length}`);
    console.log(`   日期范围: ${stockData[0]?.date} 到 ${stockData[stockData.length - 1]?.date}`);

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

