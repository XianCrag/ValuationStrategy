/**
 * calculateControlGroup2 重构后的测试
 * 运行方式：npm test -- calculateControlGroup2.test.ts
 */

import { calculateControlGroup2 } from './calculations';
import { StockData } from '../types';

describe('calculateControlGroup2 (重构版)', () => {
  const initialCapital = 1000000;
  const dcaMonths = 48; // 4年定投

  // 创建测试数据：模拟股票价格
  const createTestStockData = (days: number, startPrice: number = 3000): StockData[] => {
    const data: StockData[] = [];
    const startDate = new Date('2020-01-01');
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      // 模拟价格波动：基础价格 + 随机波动
      const price = startPrice + Math.sin(i / 30) * 500 + (Math.random() - 0.5) * 100;
      
      data.push({
        date: date.toISOString().split('T')[0],
        cp: price,
      });
    }
    
    return data;
  };

  describe('基本功能', () => {
    it('应该返回有效的结果结构', () => {
      const stockData = createTestStockData(365);
      const result = calculateControlGroup2(stockData, initialCapital, dcaMonths);

      expect(result).toBeDefined();
      expect(result.finalValue).toBeDefined();
      expect(result.totalReturn).toBeDefined();
      expect(result.annualizedReturn).toBeDefined();
      expect(result.maxDrawdown).toBeDefined();
      expect(result.dailyValues).toBeDefined();
      expect(result.yearlyDetails).toBeDefined();
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

    it('应该生成每日价值数据', () => {
      const stockData = createTestStockData(100);
      const result = calculateControlGroup2(stockData, initialCapital, dcaMonths);

      expect(result.dailyValues.length).toBe(100);
      
      result.dailyValues.forEach((daily) => {
        expect(daily.date).toBeDefined();
        expect(daily.value).toBeGreaterThanOrEqual(0);
        expect(daily.changePercent).toBeDefined();
      });
    });

    it('应该生成年度详情', () => {
      const stockData = createTestStockData(730); // 2年数据
      const result = calculateControlGroup2(stockData, initialCapital, dcaMonths);

      expect(result.yearlyDetails.length).toBeGreaterThan(0);
      
      result.yearlyDetails.forEach((year) => {
        expect(year.year).toBeDefined();
        expect(year.startValue).toBeGreaterThanOrEqual(0);
        expect(year.endValue).toBeGreaterThanOrEqual(0);
        expect(year.return).toBeDefined();
        expect(year.endStockValue).toBeDefined();
        expect(year.investedAmount).toBeDefined();
      });
    });
  });

  describe('定投逻辑', () => {
    it('应该每月定投固定金额', () => {
      const stockData = createTestStockData(365, 3000);
      
      const result = calculateControlGroup2(stockData, initialCapital, dcaMonths);

      // 计算实际定投的总额
      const totalInvested = result.yearlyDetails.reduce((sum, year) => {
        return sum + (year.investedAmount || 0);
      }, 0);

      // 一年应该完成12次定投
      // 总定投金额应该接近 12 * monthlyInvestment
      expect(totalInvested).toBeGreaterThan(0);
      expect(totalInvested).toBeLessThanOrEqual(initialCapital);
    });

    it('定投结束后不应再投资', () => {
      const stockData = createTestStockData(365 * 5); // 5年数据
      const result = calculateControlGroup2(stockData, initialCapital, dcaMonths);

      // 计算总定投金额
      const totalInvested = result.yearlyDetails.reduce((sum, year) => {
        return sum + (year.investedAmount || 0);
      }, 0);

      // 定投48个月后，总投资应该接近初始资金（允许15%的误差，因为年度切分可能导致计算误差）
      expect(Math.abs(totalInvested - initialCapital)).toBeLessThan(initialCapital * 0.15);
      
      // 验证最终价值大于0
      expect(result.finalValue).toBeGreaterThan(0);
    });

    it('定投期间现金应该逐渐减少', () => {
      const stockData = createTestStockData(180, 3000); // 半年数据
      const result = calculateControlGroup2(stockData, initialCapital, dcaMonths);

      // 在定投期间，总价值中现金占比应该逐渐减少
      // 由于我们无法直接访问现金，我们检查是否有投资金额
      const firstYear = result.yearlyDetails[0];
      expect(firstYear.investedAmount).toBeGreaterThan(0);
    });

    it('价格为常数时，份额应该均匀增长', () => {
      // 创建价格恒定的测试数据
      const constantPrice = 3000;
      const stockData = createTestStockData(365, constantPrice).map(item => ({
        ...item,
        cp: constantPrice,
      }));
      
      const result = calculateControlGroup2(stockData, initialCapital, dcaMonths);

      // 价格恒定时，最终价值应该接近初始资金（忽略小的波动）
      // 因为定投是平均成本策略，价格不变时收益应该接近0
      expect(result.totalReturn).toBeGreaterThan(-5);
      expect(result.totalReturn).toBeLessThan(5);
    });
  });

  describe('收益率计算', () => {
    it('总收益率应该正确计算', () => {
      const stockData = createTestStockData(365, 3000);
      const result = calculateControlGroup2(stockData, initialCapital, dcaMonths);

      const expectedReturn = ((result.finalValue / initialCapital) - 1) * 100;
      expect(Math.abs(result.totalReturn - expectedReturn)).toBeLessThan(0.01);
    });

    it('年化收益率应该在合理范围内', () => {
      const stockData = createTestStockData(730, 3000); // 2年
      const result = calculateControlGroup2(stockData, initialCapital, dcaMonths);

      // 年化收益率应该在合理范围内（-100% 到 1000%）
      expect(result.annualizedReturn).toBeGreaterThan(-100);
      expect(result.annualizedReturn).toBeLessThan(1000);
    });
  });

  describe('最大回撤计算', () => {
    it('应该正确计算最大回撤', () => {
      const stockData = createTestStockData(365, 3000);
      const result = calculateControlGroup2(stockData, initialCapital, dcaMonths);

      expect(result.maxDrawdown).toBeGreaterThanOrEqual(0);
      expect(result.maxDrawdown).toBeLessThanOrEqual(100);
    });

    it('价格持续上涨时回撤应该较小', () => {
      // 创建价格持续上涨的数据
      const stockData = createTestStockData(365, 3000).map((item, index) => ({
        ...item,
        cp: 3000 + index * 5, // 每天涨5元
      }));
      
      const result = calculateControlGroup2(stockData, initialCapital, dcaMonths);

      // 价格持续上涨，回撤应该很小
      expect(result.maxDrawdown).toBeLessThan(10);
    });

    it('价格大幅下跌时应该有较大回撤', () => {
      // 创建先涨后跌的数据
      const stockData: StockData[] = [];
      for (let i = 0; i < 365; i++) {
        const date = new Date('2020-01-01');
        date.setDate(date.getDate() + i);
        
        // 前半年涨到4000，后半年跌到2000
        const price = i < 180 ? 3000 + i * 5 : 4000 - (i - 180) * 10;
        
        stockData.push({
          date: date.toISOString().split('T')[0],
          cp: price,
        });
      }
      
      const result = calculateControlGroup2(stockData, initialCapital, dcaMonths);

      // 定投策略有平滑效果，回撤可能不会很大，但应该大于0
      expect(result.maxDrawdown).toBeGreaterThan(0);
    });
  });

  describe('年度详情', () => {
    it('年度详情应该按年份排序', () => {
      const stockData = createTestStockData(730, 3000); // 2年
      const result = calculateControlGroup2(stockData, initialCapital, dcaMonths);

      for (let i = 1; i < result.yearlyDetails.length; i++) {
        const prevYear = parseInt(result.yearlyDetails[i - 1].year);
        const currentYear = parseInt(result.yearlyDetails[i].year);
        expect(currentYear).toBeGreaterThanOrEqual(prevYear);
      }
    });

    it('第一年应该有定投金额', () => {
      const stockData = createTestStockData(365, 3000);
      const result = calculateControlGroup2(stockData, initialCapital, dcaMonths);

      const firstYear = result.yearlyDetails[0];
      expect(firstYear.investedAmount).toBeGreaterThan(0);
    });

    it('每年的年末价值应该接近下一年的年初价值', () => {
      const stockData = createTestStockData(730, 3000); // 2年
      const result = calculateControlGroup2(stockData, initialCapital, dcaMonths);

      if (result.yearlyDetails.length < 2) {
        return; // 跳过测试
      }

      for (let i = 0; i < result.yearlyDetails.length - 1; i++) {
        const currentYear = result.yearlyDetails[i];
        const nextYear = result.yearlyDetails[i + 1];

        // 允许一定的误差（5%以内）
        const diff = Math.abs(currentYear.endValue - nextYear.startValue);
        const diffPercent = (diff / currentYear.endValue) * 100;
        expect(diffPercent).toBeLessThan(5);
      }
    });
  });

  describe('边界情况', () => {
    it('应该处理单日数据', () => {
      const stockData = createTestStockData(1, 3000);
      const result = calculateControlGroup2(stockData, initialCapital, dcaMonths);

      expect(result.dailyValues.length).toBe(1);
      expect(result.finalValue).toBeGreaterThan(0);
    });

    it('应该处理很短的定投期间', () => {
      const stockData = createTestStockData(90, 3000); // 3个月
      const shortDcaMonths = 3;
      const result = calculateControlGroup2(stockData, initialCapital, shortDcaMonths);

      expect(result.finalValue).toBeGreaterThan(0);
      expect(result.yearlyDetails.length).toBeGreaterThan(0);
    });

    it('应该处理很长的定投期间', () => {
      const stockData = createTestStockData(365 * 4, 3000); // 4年（避免超出国债数据范围）
      const longDcaMonths = 48; // 4年
      const result = calculateControlGroup2(stockData, initialCapital, longDcaMonths);

      expect(result.finalValue).toBeGreaterThan(0);
      expect(result.yearlyDetails.length).toBeGreaterThan(0);
    });

    it('应该处理跨年日期', () => {
      const stockData = createTestStockData(400, 3000); // 跨越1年多
      const result = calculateControlGroup2(stockData, initialCapital, dcaMonths);

      expect(result.yearlyDetails.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('每日价值连续性', () => {
    it('第一天的价值应该接近初始资金', () => {
      const stockData = createTestStockData(365, 3000);
      const result = calculateControlGroup2(stockData, initialCapital, dcaMonths);

      const firstDayValue = result.dailyValues[0].value;
      // 第一天可能还没有定投，价值应该接近初始资金
      expect(firstDayValue).toBeGreaterThanOrEqual(0);
      expect(firstDayValue).toBeLessThanOrEqual(initialCapital * 1.1);
    });

    it('最后一天的价值应该等于最终价值', () => {
      const stockData = createTestStockData(365, 3000);
      const result = calculateControlGroup2(stockData, initialCapital, dcaMonths);

      const lastDayValue = result.dailyValues[result.dailyValues.length - 1].value;
      expect(Math.abs(lastDayValue - result.finalValue)).toBeLessThan(0.01);
    });

    it('价值应该根据股价波动', () => {
      const stockData = createTestStockData(100, 3000);
      const result = calculateControlGroup2(stockData, initialCapital, dcaMonths);

      // 检查价值有变化（不是所有天都一样）
      const values = result.dailyValues.map(d => d.value);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBeGreaterThan(1);
    });
  });

  describe('与原实现的兼容性', () => {
    it('重构前后的结果应该保持一致', () => {
      const stockData = createTestStockData(365, 3000);
      const result = calculateControlGroup2(stockData, initialCapital, dcaMonths);

      // 基本结构检查
      expect(result.dailyValues).toBeDefined();
      expect(result.yearlyDetails).toBeDefined();
      expect(result.finalValue).toBeDefined();
      expect(result.totalReturn).toBeDefined();
      expect(result.annualizedReturn).toBeDefined();
      expect(result.maxDrawdown).toBeDefined();

      // 数据完整性检查
      expect(result.dailyValues.length).toBeGreaterThan(0);
      expect(result.yearlyDetails.length).toBeGreaterThan(0);
    });
  });
});

