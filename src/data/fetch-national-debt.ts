/**
 * 获取每年的国债数据并保存到JSON文件（按月维度，每月保留一条数据）
 * 运行方式：npx tsx src/data/fetch-national-debt.ts
 * 
 * 注意：需要先启动开发服务器 (npm run dev)
 */

import fs from 'fs';
import path from 'path';
import type { NationalDebtDataFile, NationalDebtItem } from './types';

/**
 * 获取日期的年月字符串 (YYYY-MM)
 */
function getYearMonth(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  } catch (error) {
    console.warn(`无法解析日期: ${dateStr}`, error);
    return '';
  }
}

/**
 * 检查日期是否为每月1号
 */
function isFirstDayOfMonth(dateStr: string): boolean {
  try {
    const date = new Date(dateStr);
    return date.getDate() === 1;
  } catch (error) {
    return false;
  }
}

async function fetchNationalDebtData() {
  try {
    console.log('正在通过本地API获取国债数据...\n');
    console.log('提示：请确保开发服务器正在运行 (npm run dev)\n');

    // 获取最近30年的数据（API会自动分批获取）
    const years = 30;

    // 调用本地API获取国债数据
    const apiUrl = 'http://localhost:3000/api/lixinger';
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nationalDebtCodes: ['tcm_y10'], // 10年期国债
        years: years,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch national debt data');
    }

    const nationalDebtData = (result.data as Array<{ date: string; [key: string]: any }>)
      .filter(item => item.date) // 确保有日期字段
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (!nationalDebtData || nationalDebtData.length === 0) {
      throw new Error('未获取到国债数据');
    }

    console.log(`获取到 ${nationalDebtData.length} 条原始国债数据`);
    console.log(`日期范围：${nationalDebtData[0]?.date} 到 ${nationalDebtData[nationalDebtData.length - 1]?.date}`);

    // 按年月分组数据
    const dataByMonth = new Map<string, Array<{ date: string; [key: string]: any }>>();
    nationalDebtData.forEach((item) => {
      const yearMonth = getYearMonth(item.date);
      if (yearMonth) {
        if (!dataByMonth.has(yearMonth)) {
          dataByMonth.set(yearMonth, []);
        }
        dataByMonth.get(yearMonth)!.push(item);
      }
    });

    // 从每个月的数据中选择一条：优先选择1号，如果没有1号，选择该月最早的一条
    // 注意：此时 monthlyData 中的 date 还是完整日期格式，后续会格式化为年月
    const monthlyData: Array<{ date: string; [key: string]: any }> = [];
    const sortedMonths = Array.from(dataByMonth.keys()).sort();
    
    sortedMonths.forEach((yearMonth) => {
      const monthData = dataByMonth.get(yearMonth)!;
      // 优先选择1号的数据
      const firstDayData = monthData.find(item => isFirstDayOfMonth(item.date));
      if (firstDayData) {
        monthlyData.push(firstDayData);
      } else {
        // 如果没有1号，选择该月最早的一条（按日期排序）
        const sortedMonthData = monthData.sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        monthlyData.push(sortedMonthData[0]);
      }
    });

    console.log(`过滤后（每月一条，优先1号）: ${monthlyData.length} 条数据`);

    if (monthlyData.length === 0) {
      throw new Error('过滤后未找到数据');
    }

    // 按年份组织数据，并将date格式化为年月格式 (YYYY-MM)
    const dataByYear: NationalDebtDataFile['data'] = {};
    
    monthlyData.forEach((item) => {
      // 将date格式化为年月格式
      const yearMonth = getYearMonth(item.date);
      const formattedItem: NationalDebtItem = {
        ...item,
        date: yearMonth, // 只保留年月
        areaCode: item.areaCode || 'cn',
        tcm_y10: item.tcm_y10 || 0,
        stockCode: item.stockCode || '',
      };
      
      const year = yearMonth.substring(0, 4); // 提取年份 YYYY
      if (!dataByYear[year]) {
        dataByYear[year] = [];
      }
      dataByYear[year].push(formattedItem);
    });

    // 对每年的数据按日期排序
    Object.keys(dataByYear).forEach((year) => {
      dataByYear[year].sort((a, b) => 
        a.date.localeCompare(b.date) // 按年月字符串排序
      );
    });

    // 获取所有年份并排序
    const yearList = Object.keys(dataByYear).sort();

    // 准备保存的数据
    const fileData: NationalDebtDataFile = {
      data: dataByYear,
      metadata: {
        fetchedAt: new Date().toISOString(),
        totalRecords: nationalDebtData.length,
        filteredRecords: monthlyData.length,
        dateRange: {
          start: getYearMonth(monthlyData[0]?.date || '') || '',
          end: getYearMonth(monthlyData[monthlyData.length - 1]?.date || '') || '',
        },
        years: yearList,
        metricsList: ['tcm_y10'],
      },
    };

    // 保存到文件
    const dataDir = path.join(process.cwd(), 'src/data');
    const dataFile = path.join(dataDir, 'national-debt.json');

    // 确保目录存在
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(dataFile, JSON.stringify(fileData, null, 2), 'utf-8');

    console.log(`\n✅ 数据已保存到: ${dataFile}`);
    console.log(`   原始数据条数: ${nationalDebtData.length}`);
    console.log(`   过滤后数据条数（每月一条，优先1号）: ${monthlyData.length}`);
    console.log(`   日期范围: ${fileData.metadata.dateRange.start} 到 ${fileData.metadata.dateRange.end}`);
    console.log(`   覆盖年份: ${yearList.length} 年 (${yearList[0]} - ${yearList[yearList.length - 1]})`);
    console.log(`   各年份数据量（每月一条）:`);
    yearList.forEach((year) => {
      console.log(`     ${year}: ${dataByYear[year].length} 条`);
    });

    return fileData;
  } catch (error) {
    console.error('❌ 获取国债数据失败:', error);
    if (error instanceof Error) {
      console.error('错误信息:', error.message);
    }
    throw error;
  }
}

// 如果直接运行此文件
if (require.main === module) {
  fetchNationalDebtData()
    .then(() => {
      console.log('\n✅ 完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 失败！', error);
      process.exit(1);
    });
}

export { fetchNationalDebtData };

