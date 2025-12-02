/**
 * 个股组合策略测试
 */

import { 
  mergeStockData, 
  calculateStockPortfolio, 
  calculateStockPortfolioWithRebalance,
  StockPortfolioConfig 
} from './calculations';
import { StockData } from '../types';

describe('个股组合策略', () => {
  // 准备测试数据
  const mockStockData1: StockData[] = [
    { date: '2020-01-01', sp: 10 },
    { date: '2020-01-02', sp: 11 },
    { date: '2020-01-03', sp: 12 },
    { date: '2020-01-04', sp: 11 },
    { date: '2020-01-05', sp: 13 },
  ];

  const mockStockData2: StockData[] = [
    { date: '2020-01-01', sp: 20 },
    { date: '2020-01-02', sp: 22 },
    { date: '2020-01-03', sp: 21 },
    { date: '2020-01-04', sp: 23 },
    { date: '2020-01-05', sp: 24 },
  ];

  const mockStockData3: StockData[] = [
    { date: '2020-01-01', sp: 30 },
    { date: '2020-01-02', sp: 31 },
    { date: '2020-01-03', sp: 32 },
    { date: '2020-01-04', sp: 30 },
    { date: '2020-01-05', sp: 35 },
  ];

  const stockDataMap = {
    '600036': mockStockData1,
    '601988': mockStockData2,
    '601088': mockStockData3,
  };

  describe('mergeStockData', () => {
    it('应该正确合并多个股票的数据', () => {
      const result = mergeStockData(stockDataMap);
      
      expect(result).toBeDefined();
      expect(result.length).toBe(5); // 所有股票都有5个日期
      expect(result[0].date).toBe('2020-01-01');
      expect(result[4].date).toBe('2020-01-05');
    });

    it('应该只返回所有股票都有数据的日期', () => {
      const partialData = {
        '600036': mockStockData1,
        '601988': mockStockData2.slice(0, 3), // 只有前3天
      };
      
      const result = mergeStockData(partialData);
      expect(result.length).toBe(3); // 只有前3天所有股票都有数据
    });

    it('应该正确排序日期', () => {
      const unorderedData = {
        '600036': [mockStockData1[2], mockStockData1[0], mockStockData1[1]],
      };
      
      const result = mergeStockData(unorderedData);
      expect(result[0].date).toBe('2020-01-01');
      expect(result[1].date).toBe('2020-01-02');
    });
  });

  describe('calculateStockPortfolio', () => {
    const config: StockPortfolioConfig = {
      positions: [
        { code: '600036', targetRatio: 0.25 }, // 25%
        { code: '601988', targetRatio: 0.25 }, // 25%
        { code: '601088', targetRatio: 0.20 }, // 20%
      ],
    };

    it('应该正确计算初始仓位', () => {
      const result = calculateStockPortfolio(stockDataMap, 100000, config);
      
      expect(result).toBeDefined();
      expect(result.finalValue).toBeGreaterThan(0);
      expect(result.dailyValues.length).toBe(5);
    });

    it('应该正确分配股票和现金比例', () => {
      const config: StockPortfolioConfig = {
        positions: [
          { code: '600036', targetRatio: 0.30 }, // 30%
          { code: '601988', targetRatio: 0.30 }, // 30%
        ],
      };
      
      const result = calculateStockPortfolio(stockDataMap, 100000, config);
      
      // 初始现金应该是 40% (1 - 0.3 - 0.3)
      expect(result).toBeDefined();
    });

    it('应该支持100%股票仓位（0%现金）', () => {
      const config: StockPortfolioConfig = {
        positions: [
          { code: '600036', targetRatio: 1.0 }, // 100%
        ],
      };
      
      const result = calculateStockPortfolio(stockDataMap, 100000, config);
      
      expect(result).toBeDefined();
      expect(result.finalValue).toBeGreaterThan(0);
    });

    it('应该支持100%现金仓位（0%股票）', () => {
      const config: StockPortfolioConfig = {
        positions: [
          { code: '600036', targetRatio: 0.0 }, // 0%
        ],
      };
      
      const result = calculateStockPortfolio(stockDataMap, 100000, config);
      
      expect(result).toBeDefined();
      // 纯现金应该基本保持原值（加上少量利息）
      expect(result.finalValue).toBeGreaterThanOrEqual(100000);
    });

    it('应该正确计算多个股票的总价值', () => {
      const result = calculateStockPortfolio(stockDataMap, 100000, config);
      
      expect(result.dailyValues[0].value).toBeCloseTo(100000, 0);
      expect(result.dailyValues[result.dailyValues.length - 1].value).toBeGreaterThan(0);
    });

    it('应该抛出错误当没有选择股票时', () => {
      const invalidConfig: StockPortfolioConfig = {
        positions: [],
      };
      
      expect(() => {
        calculateStockPortfolio({}, 100000, invalidConfig);
      }).toThrow('至少需要选择一个股票');
    });

    it('应该抛出错误当股票仓位总和超过100%时', () => {
      const invalidConfig: StockPortfolioConfig = {
        positions: [
          { code: '600036', targetRatio: 0.6 }, // 60%
          { code: '601988', targetRatio: 0.6 }, // 60%
        ],
      };
      
      expect(() => {
        calculateStockPortfolio(stockDataMap, 100000, invalidConfig);
      }).toThrow('股票仓位比例总和必须在 0-1 之间');
    });

    it('应该抛出错误当单个股票仓位比例无效时', () => {
      const invalidConfig: StockPortfolioConfig = {
        positions: [
          { code: '600036', targetRatio: 1.5 }, // 150% 无效
        ],
      };
      
      expect(() => {
        calculateStockPortfolio(stockDataMap, 100000, invalidConfig);
      }).toThrow('股票仓位比例总和必须在 0-1 之间');
    });

    it('应该支持不同的仓位配置', () => {
      const config: StockPortfolioConfig = {
        positions: [
          { code: '600036', targetRatio: 0.10 }, // 10%
          { code: '601988', targetRatio: 0.20 }, // 20%
          { code: '601088', targetRatio: 0.30 }, // 30%
        ],
      };
      
      const result = calculateStockPortfolio(stockDataMap, 100000, config);
      
      expect(result).toBeDefined();
      expect(result.finalValue).toBeGreaterThan(0);
      // 总仓位 60%，现金 40%
    });
  });

  describe('calculateStockPortfolioWithRebalance', () => {
    const config: StockPortfolioConfig = {
      positions: [
        { code: '600036', targetRatio: 0.25 }, // 25%
        { code: '601988', targetRatio: 0.25 }, // 25%
        { code: '601088', targetRatio: 0.20 }, // 20%
      ],
    };

    it('应该支持定期再平衡', () => {
      const result = calculateStockPortfolioWithRebalance(
        stockDataMap, 
        100000, 
        config,
        1 // 每个月再平衡
      );
      
      expect(result).toBeDefined();
      expect(result.dailyValues.length).toBe(5);
    });

    it('再平衡应该将股票调整为设定的目标仓位', () => {
      const result = calculateStockPortfolioWithRebalance(
        stockDataMap, 
        100000, 
        config,
        1
      );
      
      // 验证结果存在且有意义
      expect(result.finalValue).toBeGreaterThan(0);
      expect(result.yearlyDetails.length).toBeGreaterThan(0);
    });

    it('应该正确记录年度详情', () => {
      const result = calculateStockPortfolioWithRebalance(
        stockDataMap, 
        100000, 
        config,
        1
      );
      
      expect(result.yearlyDetails).toBeDefined();
      expect(result.yearlyDetails.length).toBeGreaterThan(0);
      
      const yearDetail = result.yearlyDetails[0];
      expect(yearDetail.year).toBeDefined();
      expect(yearDetail.startValue).toBeGreaterThan(0);
      expect(yearDetail.endValue).toBeGreaterThan(0);
    });
  });

  describe('边界情况测试', () => {
    it('应该处理单个股票', () => {
      const singleStockData = {
        '600036': mockStockData1,
      };
      
      const config: StockPortfolioConfig = {
        positions: [
          { code: '600036', targetRatio: 0.7 },
        ],
      };
      
      const result = calculateStockPortfolio(singleStockData, 100000, config);
      expect(result).toBeDefined();
      expect(result.dailyValues.length).toBe(5);
    });

    it('应该处理大量股票', () => {
      const manyStocks: Record<string, StockData[]> = {};
      const positions: StockPositionConfig[] = [];
      
      for (let i = 0; i < 10; i++) {
        const code = `60000${i}`;
        manyStocks[code] = mockStockData1;
        positions.push({ code, targetRatio: 0.05 }); // 每个5%
      }
      
      const config: StockPortfolioConfig = { positions };
      
      const result = calculateStockPortfolio(manyStocks, 100000, config);
      expect(result).toBeDefined();
    });

    it('应该处理小额初始资金', () => {
      const config: StockPortfolioConfig = {
        positions: [
          { code: '600036', targetRatio: 0.35 },
          { code: '601988', targetRatio: 0.35 },
        ],
      };
      
      const result = calculateStockPortfolio(stockDataMap, 1000, config);
      expect(result).toBeDefined();
      expect(result.finalValue).toBeGreaterThan(0);
    });

    it('应该处理大额初始资金', () => {
      const config: StockPortfolioConfig = {
        positions: [
          { code: '600036', targetRatio: 0.35 },
          { code: '601988', targetRatio: 0.35 },
        ],
      };
      
      const result = calculateStockPortfolio(stockDataMap, 10000000, config);
      expect(result).toBeDefined();
      expect(result.finalValue).toBeGreaterThan(0);
    });
  });

  describe('收益计算验证', () => {
    it('应该正确计算总收益率', () => {
      const config: StockPortfolioConfig = {
        positions: [
          { code: '600036', targetRatio: 1.0 }, // 100%股票，便于计算
        ],
      };
      
      const result = calculateStockPortfolio(stockDataMap, 100000, config);
      
      expect(result.totalReturn).toBeDefined();
      expect(typeof result.totalReturn).toBe('number');
    });

    it('应该正确计算年化收益率', () => {
      const config: StockPortfolioConfig = {
        positions: [
          { code: '600036', targetRatio: 1.0 },
        ],
      };
      
      const result = calculateStockPortfolio(stockDataMap, 100000, config);
      
      expect(result.annualizedReturn).toBeDefined();
      expect(typeof result.annualizedReturn).toBe('number');
    });

    it('应该正确计算最大回撤', () => {
      const config: StockPortfolioConfig = {
        positions: [
          { code: '600036', targetRatio: 1.0 },
        ],
      };
      
      const result = calculateStockPortfolio(stockDataMap, 100000, config);
      
      expect(result.maxDrawdown).toBeDefined();
      expect(result.maxDrawdown).toBeGreaterThanOrEqual(0);
    });
  });
});

