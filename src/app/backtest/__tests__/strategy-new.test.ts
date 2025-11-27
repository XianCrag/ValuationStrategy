/**
 * 新策略计算函数测试
 * 测试重构后的 strategy.ts
 */

import { calculateStrategy } from '../test-utils';
import { StockData } from '../types';
import { calculateTargetStockRatio } from '../constants';

describe('策略计算函数 - 重构版', () => {
  const initialCapital = 1000000; // 100万

  describe('基础功能测试', () => {
    it('应该处理空数据', () => {
      const result = calculateStrategy([], initialCapital);
      
      expect(result.finalValue).toBe(initialCapital);
      expect(result.totalReturn).toBe(0);
      expect(result.annualizedReturn).toBe(0);
      expect(result.maxDrawdown).toBe(0);
      expect(result.trades).toEqual([]);
      expect(result.dailyStates).toEqual([]);
      expect(result.yearlyDetails).toEqual([]);
    });

    it('应该根据第一天PE计算初始仓位', () => {
      const stockData: StockData[] = [
        { date: '2020-01-01', 'pe_ttm.mcw': 12, cp: 4000 },
        { date: '2020-01-02', 'pe_ttm.mcw': 12, cp: 4010 },
      ];

      const result = calculateStrategy(stockData, initialCapital);
      
      const expectedRatio = calculateTargetStockRatio(12); // PE=12 -> 50%
      expect(expectedRatio).toBe(0.5);
      
      const firstState = result.dailyStates[0];
      expect(firstState.stockRatio).toBeCloseTo(0.5, 2);
      expect(firstState.bondRatio).toBeCloseTo(0.5, 2);
    });

    it('应该在PE变化时调仓', () => {
      // 构造数据：PE从12变到14（6个月后）
      const stockData: StockData[] = [];
      
      // 前6个月 PE=12 (股票50%)
      for (let i = 0; i < 180; i++) {
        const date = new Date(2020, 0, 1 + i);
        const dateStr = date.toISOString().split('T')[0];
        stockData.push({ 
          date: dateStr, 
          'pe_ttm.mcw': 12, 
          cp: 4000 + i 
        });
      }
      
      // 后6个月 PE=14 (股票30%)
      for (let i = 180; i < 360; i++) {
        const date = new Date(2020, 0, 1 + i);
        const dateStr = date.toISOString().split('T')[0];
        stockData.push({ 
          date: dateStr, 
          'pe_ttm.mcw': 14, 
          cp: 4000 + i 
        });
      }

      const result = calculateStrategy(stockData, initialCapital);
      
      // 应该有1次交易（6个月后PE从12变到14）
      expect(result.trades.length).toBeGreaterThan(0);
      
      // 检查第一次交易
      const firstTrade = result.trades[0];
      expect(firstTrade.type).toBe('sell'); // PE升高，减少股票
      expect(firstTrade.stockRatio).toBe(0.3); // PE=14 -> 30%
    });

    it('应该在PE不变时不调仓', () => {
      // 构造数据：PE始终为12
      const stockData: StockData[] = [];
      
      for (let i = 0; i < 365; i++) {
        const date = new Date(2020, 0, 1 + i);
        const dateStr = date.toISOString().split('T')[0];
        stockData.push({ 
          date: dateStr, 
          'pe_ttm.mcw': 12, 
          cp: 4000 + i * 10 
        });
      }

      const result = calculateStrategy(stockData, initialCapital);
      
      // PE不变，应该没有交易
      expect(result.trades.length).toBe(0);
    });
  });

  describe('PE-仓位映射测试', () => {
    it('PE <= 11 应该是 60% 股票', () => {
      const stockData: StockData[] = [
        { date: '2020-01-01', 'pe_ttm.mcw': 11, cp: 4000 },
        { date: '2020-01-02', 'pe_ttm.mcw': 10, cp: 4010 },
      ];

      const result = calculateStrategy(stockData, initialCapital);
      
      const firstState = result.dailyStates[0];
      expect(firstState.stockRatio).toBeCloseTo(0.6, 2);
    });

    it('PE >= 16 应该是 10% 股票', () => {
      const stockData: StockData[] = [
        { date: '2020-01-01', 'pe_ttm.mcw': 16, cp: 4000 },
        { date: '2020-01-02', 'pe_ttm.mcw': 18, cp: 4010 },
      ];

      const result = calculateStrategy(stockData, initialCapital);
      
      const firstState = result.dailyStates[0];
      expect(firstState.stockRatio).toBeCloseTo(0.1, 2);
    });

    it('PE在11-16之间应该线性插值', () => {
      const testCases = [
        { pe: 11, expectedRatio: 0.6 },
        { pe: 12, expectedRatio: 0.5 },
        { pe: 13, expectedRatio: 0.4 },
        { pe: 14, expectedRatio: 0.3 },
        { pe: 15, expectedRatio: 0.2 },
        { pe: 16, expectedRatio: 0.1 },
      ];

      testCases.forEach(({ pe, expectedRatio }) => {
        const stockData: StockData[] = [
          { date: '2020-01-01', 'pe_ttm.mcw': pe, cp: 4000 },
        ];

        const result = calculateStrategy(stockData, initialCapital);
        const firstState = result.dailyStates[0];
        
        expect(firstState.stockRatio).toBeCloseTo(expectedRatio, 2);
      });
    });
  });

  describe('收益计算测试', () => {
    it('股票上涨应该增加总价值', () => {
      const stockData: StockData[] = [
        { date: '2020-01-01', 'pe_ttm.mcw': 12, cp: 4000 },
        { date: '2020-12-31', 'pe_ttm.mcw': 12, cp: 4400 }, // 上涨10%
      ];

      const result = calculateStrategy(stockData, initialCapital);
      
      // 股票占50%，涨10%，股票部分收益=5%
      // 债券占50%，利息约3%，债券部分收益=1.5%
      // 总收益约 6.5%
      expect(result.totalReturn).toBeGreaterThan(5);
      expect(result.finalValue).toBeGreaterThan(initialCapital);
    });

    it('应该计算债券利息', () => {
      // 构造一年的数据
      const stockData: StockData[] = [];
      
      for (let month = 0; month < 12; month++) {
        const date = new Date(2020, month, 15);
        const dateStr = date.toISOString().split('T')[0];
        stockData.push({ 
          date: dateStr, 
          'pe_ttm.mcw': 12, 
          cp: 4000 
        });
      }

      const result = calculateStrategy(stockData, initialCapital);
      
      // 年度详情应该包含债券利息
      if (result.yearlyDetails.length > 0) {
        const yearDetail = result.yearlyDetails[0];
        expect(yearDetail.bondInterest).toBeGreaterThan(0);
      }
    });
  });

  describe('调仓频率测试', () => {
    it('应该每6个月检查一次', () => {
      const stockData: StockData[] = [];
      
      // 构造2年数据，每6个月PE变化一次
      const peSchedule = [
        { months: [0, 1, 2, 3, 4, 5], pe: 12 },      // 前6个月 PE=12 (50%)
        { months: [6, 7, 8, 9, 10, 11], pe: 14 },    // 第二个6个月 PE=14 (30%)
        { months: [12, 13, 14, 15, 16, 17], pe: 13 }, // 第三个6个月 PE=13 (40%)
        { months: [18, 19, 20, 21, 22, 23], pe: 15 }, // 第四个6个月 PE=15 (20%)
      ];

      peSchedule.forEach(schedule => {
        schedule.months.forEach(month => {
          for (let day = 1; day <= 30; day++) {
            const date = new Date(2020, month, day);
            const dateStr = date.toISOString().split('T')[0];
            stockData.push({ 
              date: dateStr, 
              'pe_ttm.mcw': schedule.pe, 
              cp: 4000 
            });
          }
        });
      });

      const result = calculateStrategy(stockData, initialCapital);
      
      // 应该有3次交易（每6个月一次，共4个周期，减去初始周期）
      expect(result.trades.length).toBe(3);
    });
  });

  describe('数据结构测试', () => {
    it('应该包含完整的数据结构', () => {
      const stockData: StockData[] = [
        { date: '2020-01-01', 'pe_ttm.mcw': 12, cp: 4000 },
        { date: '2020-12-31', 'pe_ttm.mcw': 12, cp: 4200 },
      ];

      const result = calculateStrategy(stockData, initialCapital);
      
      // 检查必需字段
      expect(result).toHaveProperty('trades');
      expect(result).toHaveProperty('dailyStates');
      expect(result).toHaveProperty('finalValue');
      expect(result).toHaveProperty('totalReturn');
      expect(result).toHaveProperty('annualizedReturn');
      expect(result).toHaveProperty('finalStockRatio');
      expect(result).toHaveProperty('maxDrawdown');
      expect(result).toHaveProperty('yearlyDetails');
      
      // 检查 dailyStates 结构
      if (result.dailyStates.length > 0) {
        const state = result.dailyStates[0];
        expect(state).toHaveProperty('date');
        expect(state).toHaveProperty('stockRatio');
        expect(state).toHaveProperty('bondRatio');
        expect(state).toHaveProperty('stockValue');
        expect(state).toHaveProperty('bondValue');
        expect(state).toHaveProperty('totalValue');
        expect(state).toHaveProperty('changePercent');
        expect(state).toHaveProperty('annualizedReturn');
      }
      
      // 检查 yearlyDetails 结构
      if (result.yearlyDetails.length > 0) {
        const year = result.yearlyDetails[0];
        expect(year).toHaveProperty('year');
        expect(year).toHaveProperty('startValue');
        expect(year).toHaveProperty('endValue');
        expect(year).toHaveProperty('return');
        expect(year).toHaveProperty('bondInterest');
      }
    });

    it('股票价值 + 债券价值 = 总价值', () => {
      const stockData: StockData[] = [
        { date: '2020-01-01', 'pe_ttm.mcw': 12, cp: 4000 },
        { date: '2020-06-30', 'pe_ttm.mcw': 13, cp: 4200 },
        { date: '2020-12-31', 'pe_ttm.mcw': 13, cp: 4400 },
      ];

      const result = calculateStrategy(stockData, initialCapital);
      
      result.dailyStates.forEach(state => {
        const total = state.stockValue + state.bondValue;
        expect(Math.abs(total - state.totalValue)).toBeLessThan(0.01);
      });
    });
  });

  describe('年度详情测试', () => {
    it('应该生成正确的年度详情', () => {
      const stockData: StockData[] = [];
      
      // 构造2年数据
      for (let year = 2020; year <= 2021; year++) {
        for (let month = 0; month < 12; month++) {
          const date = new Date(year, month, 15);
          const dateStr = date.toISOString().split('T')[0];
          stockData.push({ 
            date: dateStr, 
            'pe_ttm.mcw': 12, 
            cp: 4000 + (year - 2020) * 100 
          });
        }
      }

      const result = calculateStrategy(stockData, initialCapital);
      
      // 应该有2年的数据
      expect(result.yearlyDetails.length).toBe(2);
      
      // 检查年份
      expect(result.yearlyDetails[0].year).toBe('2020');
      expect(result.yearlyDetails[1].year).toBe('2021');
      
      // 每年的结束价值应该接近下一年的开始价值（允许有利息差异）
      const year1End = result.yearlyDetails[0].endValue;
      const year2Start = result.yearlyDetails[1].startValue;
      // 允许有一定的差异，因为年末可能有利息结算
      const difference = Math.abs(year1End - year2Start);
      const tolerance = initialCapital * 0.05; // 5% 的容差
      expect(difference).toBeLessThan(tolerance);
    });
  });
});

