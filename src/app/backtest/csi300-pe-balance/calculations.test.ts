import {
  calculateTargetStockRatioByPE,
  DEFAULT_PE_MIN,
  DEFAULT_PE_MAX,
  DEFAULT_POSITION_LEVELS,
  DEFAULT_MIN_STOCK_RATIO,
  DEFAULT_MAX_STOCK_RATIO,
  DEFAULT_REVIEW_INTERVAL_MONTHS,
  CSI300PEBalanceParams,
} from './calculations';

describe('CSI300 PE Balance Strategy Calculations', () => {
  // 默认参数
  const defaultParams: CSI300PEBalanceParams = {
    peMin: DEFAULT_PE_MIN,
    peMax: DEFAULT_PE_MAX,
    minStockRatio: DEFAULT_MIN_STOCK_RATIO,
    maxStockRatio: DEFAULT_MAX_STOCK_RATIO,
    positionLevels: DEFAULT_POSITION_LEVELS,
    reviewIntervalMonths: DEFAULT_REVIEW_INTERVAL_MONTHS,
  };

  describe('calculateTargetStockRatioByPE', () => {
    it('should return maximum ratio (60%) when PE <= 11', () => {
      expect(calculateTargetStockRatioByPE(10, defaultParams)).toBe(0.6);
      expect(calculateTargetStockRatioByPE(11, defaultParams)).toBe(0.6);
      expect(calculateTargetStockRatioByPE(9, defaultParams)).toBe(0.6);
    });

    it('should return minimum ratio (10%) when PE >= 16', () => {
      expect(calculateTargetStockRatioByPE(16, defaultParams)).toBe(0.1);
      expect(calculateTargetStockRatioByPE(17, defaultParams)).toBe(0.1);
      expect(calculateTargetStockRatioByPE(20, defaultParams)).toBe(0.1);
    });

    it('should return discrete levels between min and max', () => {
      // 对于 POSITION_LEVELS = 6，档位间隔 = (0.6 - 0.1) / 5 = 0.1
      // 档位应该是：0.1, 0.2, 0.3, 0.4, 0.5, 0.6
      
      // PE = 11 → 0.6
      expect(calculateTargetStockRatioByPE(11, defaultParams)).toBe(0.6);
      
      // PE = 12 → 应该接近 0.5
      expect(calculateTargetStockRatioByPE(12, defaultParams)).toBe(0.5);
      
      // PE = 13.5 → 应该在中间，接近 0.35
      expect(calculateTargetStockRatioByPE(13.5, defaultParams)).toBeCloseTo(0.35, 1);
      
      // PE = 16 → 0.1
      expect(calculateTargetStockRatioByPE(16, defaultParams)).toBe(0.1);
    });

    it('should return values between 0.1 and 0.6 for all inputs', () => {
      const testValues = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
      testValues.forEach(pe => {
        const ratio = calculateTargetStockRatioByPE(pe, defaultParams);
        expect(ratio).toBeGreaterThanOrEqual(0.1);
        expect(ratio).toBeLessThanOrEqual(0.6);
      });
    });

    it('should only return discrete position levels', () => {
      // 计算所有可能的档位值
      const step = (defaultParams.maxStockRatio - defaultParams.minStockRatio) / (defaultParams.positionLevels - 1);
      const validLevels = Array.from({ length: defaultParams.positionLevels }, (_, i) => 
        parseFloat((defaultParams.minStockRatio + i * step).toFixed(10))
      );

      // 测试多个PE值，确保返回的都是有效档位
      const testValues = [9, 10, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 17];
      testValues.forEach(pe => {
        const ratio = parseFloat(calculateTargetStockRatioByPE(pe, defaultParams).toFixed(10));
        expect(validLevels).toContain(ratio);
      });
    });

    it('should work with custom parameters', () => {
      const customParams: CSI300PEBalanceParams = {
        peMin: 10,
        peMax: 20,
        minStockRatio: 0.2,
        maxStockRatio: 0.8,
        positionLevels: 4,
        reviewIntervalMonths: 3,
      };

      // 测试边界
      expect(calculateTargetStockRatioByPE(9, customParams)).toBe(0.8);
      expect(calculateTargetStockRatioByPE(21, customParams)).toBe(0.2);
      
      // 测试中间值应该是离散档位
      const ratio = calculateTargetStockRatioByPE(15, customParams);
      expect(ratio).toBeGreaterThanOrEqual(0.2);
      expect(ratio).toBeLessThanOrEqual(0.8);
    });

    it('should handle PE inversely - lower PE means higher position', () => {
      const pe11 = calculateTargetStockRatioByPE(11, defaultParams);
      const pe13 = calculateTargetStockRatioByPE(13, defaultParams);
      const pe15 = calculateTargetStockRatioByPE(15, defaultParams);
      
      // PE越低，仓位越高
      expect(pe11).toBeGreaterThan(pe13);
      expect(pe13).toBeGreaterThan(pe15);
    });
  });
});

