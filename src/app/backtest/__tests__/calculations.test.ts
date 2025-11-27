/**
 * 策略计算函数测试
 */

import {
  calculateStrategy,
  calculateControlGroup1,
  calculateControlGroup2,
} from '../common/calculations';
import { StockData, BondData } from '../types';
import fs from 'fs';
import path from 'path';

// 加载真实测试数据
function loadRealTestData(): { stockData: StockData[]; bondData: BondData[] } {
  const testDataFile = path.join(process.cwd(), 'src/app/backtest/test-data.json');
  
  if (!fs.existsSync(testDataFile)) {
    throw new Error(
      '测试数据文件不存在！\n' +
      '请先运行: npm run fetch:test-data'
    );
  }
  
  try {
    const fileContent = fs.readFileSync(testDataFile, 'utf-8');
    const testData = JSON.parse(fileContent);
    const stockData = testData.stockData as StockData[];
    
    // 为股票数据添加必要的字段（如果缺失）
    const enrichedStockData = stockData.map(item => ({
      ...item,
      'pe_ttm.mcw': item['pe_ttm.mcw'] || (item.cp ? item.cp / 300 : 12), // 如果没有PE，基于价格计算一个合理的PE值
    }));
    
    // 创建模拟的债券数据（使用股票数据的日期，确保日期匹配）
    const bondData: BondData[] = enrichedStockData.map(item => ({
      date: item.date,
      tcm_y10: 0.03 + Math.random() * 0.02, // 3% - 5% 之间的随机利率
    }));
    
    return { stockData: enrichedStockData, bondData };
  } catch (error) {
    throw new Error(`无法读取测试数据文件: ${error}`);
  }
}

describe('策略计算函数', () => {
  let stockData: StockData[];
  let bondData: BondData[];
  const initialCapital = 1000000; // 100万

  beforeAll(() => {
    const data = loadRealTestData();
    stockData = data.stockData;
    bondData = data.bondData;
    console.log(`📁 加载测试数据：股票 ${stockData.length} 条，债券 ${bondData.length} 条`);
  });

  describe('calculateStrategy - 主策略', () => {
    it('应该返回有效的策略结果', () => {
      const result = calculateStrategy(stockData, bondData, initialCapital);
      
      expect(result).toBeDefined();
      expect(result.finalValue).toBeGreaterThan(0);
      expect(result.totalReturn).toBeDefined();
      expect(result.annualizedReturn).toBeDefined();
      expect(result.maxDrawdown).toBeDefined();
      expect(result.finalStockRatio).toBeGreaterThanOrEqual(0);
      expect(result.finalStockRatio).toBeLessThanOrEqual(1);
    });

    it('应该包含交易记录', () => {
      const result = calculateStrategy(stockData, bondData, initialCapital);
      
      expect(result.trades).toBeDefined();
      expect(Array.isArray(result.trades)).toBe(true);
      
      result.trades.forEach((trade) => {
        expect(trade.date).toBeDefined();
        expect(['buy', 'sell']).toContain(trade.type);
        expect(trade.stockRatio).toBeGreaterThanOrEqual(0);
        expect(trade.stockRatio).toBeLessThanOrEqual(1);
        expect(trade.bondRatio).toBeGreaterThanOrEqual(0);
        expect(trade.bondRatio).toBeLessThanOrEqual(1);
        expect(trade.totalValue).toBeGreaterThan(0);
      });
    });

    it('应该包含每日状态', () => {
      const result = calculateStrategy(stockData, bondData, initialCapital);
      
      expect(result.dailyStates).toBeDefined();
      // 注意：如果股票和债券数据没有重叠的日期，dailyStates 可能为空
      if (result.dailyStates.length > 0) {
        result.dailyStates.forEach((state) => {
          expect(state.date).toBeDefined();
          expect(state.stockRatio + state.bondRatio).toBeCloseTo(1, 5);
          expect(state.totalValue).toBeGreaterThan(0);
        });
      }
    });

    it('应该包含年度详情', () => {
      const result = calculateStrategy(stockData, bondData, initialCapital);
      
      expect(result.yearlyDetails).toBeDefined();
      // 注意：如果数据不足或没有跨年，可能没有年度详情
      if (result.yearlyDetails.length > 0) {
        result.yearlyDetails.forEach((year) => {
          expect(year.year).toBeDefined();
          expect(year.startValue).toBeGreaterThan(0);
          expect(year.endValue).toBeGreaterThan(0);
          expect(year.startStockValue).toBeGreaterThanOrEqual(0);
          expect(year.endStockValue).toBeGreaterThanOrEqual(0);
          expect(year.startBondValue).toBeGreaterThanOrEqual(0);
          expect(year.endBondValue).toBeGreaterThanOrEqual(0);
          expect(year.return).toBeDefined();
          expect(year.trades).toBeGreaterThanOrEqual(0);
        });
      }
    });

    it('股票和债券价值之和应该等于总价值', () => {
      const result = calculateStrategy(stockData, bondData, initialCapital);
      
      result.dailyStates.forEach((state) => {
        const total = state.stockValue + state.bondValue;
        expect(Math.abs(total - state.totalValue)).toBeLessThan(0.01);
      });
    });

    it('初始仓位应该是60%股票，40%债券', () => {
      const result = calculateStrategy(stockData, bondData, initialCapital);
      
      if (result.dailyStates.length > 0) {
        const firstState = result.dailyStates[0];
        expect(firstState.stockRatio).toBeCloseTo(0.6, 1);
        expect(firstState.bondRatio).toBeCloseTo(0.4, 1);
      }
    });
  });

  describe('calculateControlGroup1 - 现金国债', () => {
    it('应该返回有效的结果', () => {
      const startDate = new Date(stockData[0].date);
      const endDate = new Date(stockData[stockData.length - 1].date);
      const result = calculateControlGroup1(startDate, endDate, initialCapital);
      
      expect(result).toBeDefined();
      expect(result.finalValue).toBeGreaterThan(0);
      expect(result.totalReturn).toBeDefined();
      expect(result.annualizedReturn).toBeDefined();
      expect(result.maxDrawdown).toBeDefined();
    });

    it('应该包含每日价值数据', () => {
      const startDate = new Date(stockData[0].date);
      const endDate = new Date(stockData[stockData.length - 1].date);
      const result = calculateControlGroup1(startDate, endDate, initialCapital);
      
      expect(result.dailyValues).toBeDefined();
      expect(result.dailyValues.length).toBeGreaterThan(0);
      
      result.dailyValues.forEach((value) => {
        expect(value.date).toBeDefined();
        expect(value.value).toBeGreaterThan(0);
        expect(value.changePercent).toBeDefined();
      });
    });

    it('应该包含年度详情', () => {
      const startDate = new Date(stockData[0].date);
      const endDate = new Date(stockData[stockData.length - 1].date);
      const result = calculateControlGroup1(startDate, endDate, initialCapital);
      
      expect(result.yearlyDetails).toBeDefined();
      expect(result.yearlyDetails.length).toBeGreaterThan(0);
      
      result.yearlyDetails.forEach((year) => {
        expect(year.year).toBeDefined();
        expect(year.startValue).toBeGreaterThan(0);
        expect(year.endValue).toBeGreaterThan(0);
        expect(year.return).toBeDefined();
        if (year.cashInterest !== undefined) {
          expect(year.cashInterest).toBeGreaterThanOrEqual(0);
        }
      });
    });

    it('最终价值应该大于初始资金（因为有复利）', () => {
      const startDate = new Date(stockData[0].date);
      const endDate = new Date(stockData[stockData.length - 1].date);
      const result = calculateControlGroup1(startDate, endDate, initialCapital);
      
      // 如果时间跨度足够长，最终价值应该大于初始资金
      const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 365) {
        expect(result.finalValue).toBeGreaterThan(initialCapital);
      }
    });

    it('年度详情应该按年份排序', () => {
      const startDate = new Date(stockData[0].date);
      const endDate = new Date(stockData[stockData.length - 1].date);
      const result = calculateControlGroup1(startDate, endDate, initialCapital);
      
      for (let i = 1; i < result.yearlyDetails.length; i++) {
        const prevYear = parseInt(result.yearlyDetails[i - 1].year);
        const currentYear = parseInt(result.yearlyDetails[i].year);
        expect(currentYear).toBeGreaterThan(prevYear);
      }
    });
  });

  describe('calculateControlGroup2 - 定投沪深300', () => {
    const dcaMonths = 48; // 4年

    it('应该返回有效的结果', () => {
      const result = calculateControlGroup2(stockData, initialCapital, dcaMonths);
      
      expect(result).toBeDefined();
      expect(result.finalValue).toBeGreaterThan(0);
      expect(result.totalReturn).toBeDefined();
      expect(result.annualizedReturn).toBeDefined();
      expect(result.maxDrawdown).toBeDefined();
    });

    it('应该包含每日价值数据', () => {
      const result = calculateControlGroup2(stockData, initialCapital, dcaMonths);
      
      expect(result.dailyValues).toBeDefined();
      expect(result.dailyValues.length).toBeGreaterThan(0);
      
      result.dailyValues.forEach((value) => {
        expect(value.date).toBeDefined();
        expect(value.value).toBeGreaterThanOrEqual(0);
        expect(value.changePercent).toBeDefined();
      });
    });

    it('应该包含年度详情', () => {
      const result = calculateControlGroup2(stockData, initialCapital, dcaMonths);
      
      expect(result.yearlyDetails).toBeDefined();
      expect(result.yearlyDetails.length).toBeGreaterThan(0);
      
      result.yearlyDetails.forEach((year) => {
        expect(year.year).toBeDefined();
        expect(year.startValue).toBeGreaterThan(0);
        expect(year.endValue).toBeGreaterThan(0);
        expect(year.return).toBeDefined();
        if (year.stockValue !== undefined) {
          expect(year.stockValue).toBeGreaterThanOrEqual(0);
        }
        if (year.investedAmount !== undefined) {
          expect(year.investedAmount).toBeGreaterThanOrEqual(0);
        }
      });
    });

    it('年末总价值应该等于最终价值', () => {
      const result = calculateControlGroup2(stockData, initialCapital, dcaMonths);
      const lastYear = result.yearlyDetails[result.yearlyDetails.length - 1];
      
      expect(lastYear).toBeDefined();
      expect(Math.abs(lastYear.endValue - result.finalValue)).toBeLessThan(0.01);
    });

    it('年度详情应该按年份排序', () => {
      const result = calculateControlGroup2(stockData, initialCapital, dcaMonths);
      
      for (let i = 1; i < result.yearlyDetails.length; i++) {
        const prevYear = parseInt(result.yearlyDetails[i - 1].year);
        const currentYear = parseInt(result.yearlyDetails[i].year);
        expect(currentYear).toBeGreaterThan(prevYear);
      }
    });

    it('应该处理空数据', () => {
      const result = calculateControlGroup2([], initialCapital, dcaMonths);
      
      expect(result.finalValue).toBe(initialCapital);
      expect(result.totalReturn).toBe(0);
      expect(result.annualizedReturn).toBe(0);
      expect(result.maxDrawdown).toBe(0);
      expect(result.dailyValues).toEqual([]);
      expect(result.yearlyDetails).toEqual([]);
    });
  });

  describe('边界情况测试', () => {
    it('calculateStrategy 应该处理空数据', () => {
      const result = calculateStrategy([], [], initialCapital);
      
      // 即使没有数据，也应该返回初始值
      expect(result.finalValue).toBe(initialCapital);
      expect(result.trades).toEqual([]);
      expect(result.dailyStates).toEqual([]);
    });

    it('calculateControlGroup1 应该处理空债券数据', () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2021-01-01');
      const result = calculateControlGroup1(startDate, endDate, initialCapital);
      
      // 应该使用默认利率
      expect(result.finalValue).toBeGreaterThan(0);
    });

    it('所有策略的年化收益率应该合理', () => {
      const strategyResult = calculateStrategy(stockData, bondData, initialCapital);
      const startDate = new Date(stockData[0].date);
      const endDate = new Date(stockData[stockData.length - 1].date);
      const control1Result = calculateControlGroup1(startDate, endDate, initialCapital);
      const control2Result = calculateControlGroup2(stockData, initialCapital, 48);
      
      // 年化收益率应该在合理范围内（-100% 到 1000%）
      expect(strategyResult.annualizedReturn).toBeGreaterThan(-100);
      expect(strategyResult.annualizedReturn).toBeLessThan(1000);
      
      expect(control1Result.annualizedReturn).toBeGreaterThan(-100);
      expect(control1Result.annualizedReturn).toBeLessThan(1000);
      
      expect(control2Result.annualizedReturn).toBeGreaterThan(-100);
      expect(control2Result.annualizedReturn).toBeLessThan(1000);
    });
  });
});

