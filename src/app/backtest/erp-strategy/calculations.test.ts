import {
  calculateTargetStockRatioByERP,
  DEFAULT_ERP_MIN,
  DEFAULT_ERP_MAX,
  DEFAULT_POSITION_LEVELS,
  DEFAULT_MIN_STOCK_RATIO,
  DEFAULT_MAX_STOCK_RATIO,
  DEFAULT_REVIEW_INTERVAL_MONTHS,
  ERPStrategyParams,
} from './calculations';

describe('ERP Strategy Calculations', () => {
  // 默认参数
  const defaultParams: ERPStrategyParams = {
    erpMin: DEFAULT_ERP_MIN,
    erpMax: DEFAULT_ERP_MAX,
    minStockRatio: DEFAULT_MIN_STOCK_RATIO,
    maxStockRatio: DEFAULT_MAX_STOCK_RATIO,
    positionLevels: DEFAULT_POSITION_LEVELS,
    reviewIntervalMonths: DEFAULT_REVIEW_INTERVAL_MONTHS,
  };

  describe('calculateTargetStockRatioByERP', () => {
    it('should return minimum ratio (20%) when ERP <= 1', () => {
      expect(calculateTargetStockRatioByERP(0.5, defaultParams)).toBe(0.2);
      expect(calculateTargetStockRatioByERP(1, defaultParams)).toBe(0.2);
      expect(calculateTargetStockRatioByERP(0, defaultParams)).toBe(0.2);
    });

    it('should return maximum ratio (80%) when ERP >= 4', () => {
      expect(calculateTargetStockRatioByERP(4, defaultParams)).toBe(0.8);
      expect(calculateTargetStockRatioByERP(5, defaultParams)).toBe(0.8);
      expect(calculateTargetStockRatioByERP(6, defaultParams)).toBe(0.8);
    });

    it('should return discrete levels between min and max', () => {
      // 对于 POSITION_LEVELS = 6，应该有6个档位
      // 档位间隔 = (0.8 - 0.2) / 5 = 0.12
      // 档位：0.2, 0.32, 0.44, 0.56, 0.68, 0.8
      if (defaultParams.positionLevels === 6) {
        // ERP = 1.5 应该接近 0.32
        expect(calculateTargetStockRatioByERP(1.5, defaultParams)).toBeCloseTo(0.32, 1);
        
        // ERP = 2.5 应该在档位 0.44
        expect(calculateTargetStockRatioByERP(2.5, defaultParams)).toBeCloseTo(0.44, 1);
        
        // ERP = 3.5 应该接近 0.68
        expect(calculateTargetStockRatioByERP(3.5, defaultParams)).toBeCloseTo(0.68, 1);
      }
    });

    it('should return values between 0.2 and 0.8 for all inputs', () => {
      const testValues = [-1, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 10];
      testValues.forEach(erp => {
        const ratio = calculateTargetStockRatioByERP(erp, defaultParams);
        expect(ratio).toBeGreaterThanOrEqual(0.2);
        expect(ratio).toBeLessThanOrEqual(0.8);
      });
    });

    it('should only return discrete position levels', () => {
      // 计算所有可能的档位值
      const step = (defaultParams.maxStockRatio - defaultParams.minStockRatio) / (defaultParams.positionLevels - 1);
      const validLevels = Array.from({ length: defaultParams.positionLevels }, (_, i) => 
        parseFloat((defaultParams.minStockRatio + i * step).toFixed(10))
      );

      // 测试多个ERP值，确保返回的都是有效档位
      const testValues = [0, 0.5, 1, 1.2, 1.5, 1.8, 2, 2.2, 2.5, 2.8, 3, 3.2, 3.5, 3.8, 4, 5];
      testValues.forEach(erp => {
        const ratio = parseFloat(calculateTargetStockRatioByERP(erp, defaultParams).toFixed(10));
        expect(validLevels).toContain(ratio);
      });
    });

    it('should work with custom parameters', () => {
      const customParams: ERPStrategyParams = {
        erpMin: 2,
        erpMax: 5,
        minStockRatio: 0.2,
        maxStockRatio: 0.8,
        positionLevels: 4,
        reviewIntervalMonths: 3,
      };

      // 测试边界
      expect(calculateTargetStockRatioByERP(1, customParams)).toBe(0.2);
      expect(calculateTargetStockRatioByERP(6, customParams)).toBe(0.8);
      
      // 测试中间值应该是离散档位
      const ratio = calculateTargetStockRatioByERP(3.5, customParams);
      expect(ratio).toBeGreaterThanOrEqual(0.2);
      expect(ratio).toBeLessThanOrEqual(0.8);
    });
  });
});

