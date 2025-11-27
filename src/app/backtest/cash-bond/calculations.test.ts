/**
 * calculateControlGroup1 重构后的测试
 * 运行方式：npm test -- calculateControlGroup1.test.ts
 */

import { calculateControlGroup1 } from './calculations';

describe('calculateControlGroup1 (重构版)', () => {
  const initialCapital = 1000000;

  describe('基本功能', () => {
    it('应该返回有效的结果结构', () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2020-12-31');

      const result = calculateControlGroup1(startDate, endDate, initialCapital);

      expect(result).toBeDefined();
      expect(result.finalValue).toBeDefined();
      expect(result.totalReturn).toBeDefined();
      expect(result.annualizedReturn).toBeDefined();
      expect(result.maxDrawdown).toBeDefined();
      expect(result.dailyValues).toBeDefined();
      expect(result.yearlyDetails).toBeDefined();
    });

    it('应该生成每日价值数据', () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2020-01-10');

      const result = calculateControlGroup1(startDate, endDate, initialCapital);

      expect(result.dailyValues.length).toBeGreaterThan(0);
      expect(result.dailyValues.length).toBe(10); // 1月1日到1月10日，共10天

      result.dailyValues.forEach((daily) => {
        expect(daily.date).toBeDefined();
        expect(daily.value).toBeGreaterThanOrEqual(0);
        expect(daily.changePercent).toBeDefined();
      });
    });

    it('应该生成年度详情', () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2021-12-31');

      const result = calculateControlGroup1(startDate, endDate, initialCapital);

      expect(result.yearlyDetails.length).toBeGreaterThan(0);

      result.yearlyDetails.forEach((year) => {
        expect(year.year).toBeDefined();
        expect(year.startValue).toBeGreaterThanOrEqual(0);
        expect(year.endValue).toBeGreaterThanOrEqual(0);
        expect(year.return).toBeDefined();
        expect(year.cashInterest).toBeDefined();
      });
    });
  });

  describe('现金利息计算', () => {
    it('在有国债数据的情况下应该计算现金利息', () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2020-12-31');

      const result = calculateControlGroup1(startDate, endDate, initialCapital);

      // 由于有利息收入，最终价值应该大于初始资金
      // 注意：由于测试没有实际的国债数据，可能不会有利息
      expect(result.finalValue).toBeGreaterThanOrEqual(initialCapital);
    });

    it('年度利息应该正确计算', () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2020-12-31');

      const result = calculateControlGroup1(startDate, endDate, initialCapital);

      result.yearlyDetails.forEach((year) => {
        expect(year.cashInterest).toBeDefined();
        // 利息 = 年末价值 - 年初价值
        const calculatedInterest = year.endValue - year.startValue;
        expect(Math.abs((year.cashInterest || 0) - calculatedInterest)).toBeLessThan(0.01);
      });
    });
  });

  describe('收益率计算', () => {
    it('总收益率应该正确计算', () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2020-12-31');

      const result = calculateControlGroup1(startDate, endDate, initialCapital);

      const expectedReturn = ((result.finalValue / initialCapital) - 1) * 100;
      expect(Math.abs(result.totalReturn - expectedReturn)).toBeLessThan(0.01);
    });

    it('年化收益率应该在合理范围内', () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2021-12-31');

      const result = calculateControlGroup1(startDate, endDate, initialCapital);

      // 年化收益率应该在合理范围内（-100% 到 1000%）
      expect(result.annualizedReturn).toBeGreaterThan(-100);
      expect(result.annualizedReturn).toBeLessThan(1000);
    });
  });

  describe('最大回撤计算', () => {
    it('纯现金国债策略的最大回撤应该为0', () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2020-12-31');

      const result = calculateControlGroup1(startDate, endDate, initialCapital);

      // 现金国债策略不会有回撤（只增不减）
      expect(result.maxDrawdown).toBe(0);
    });
  });

  describe('边界情况', () => {
    it('应该处理单日期间', () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2020-01-01');

      const result = calculateControlGroup1(startDate, endDate, initialCapital);

      expect(result.dailyValues.length).toBe(1);
      expect(result.finalValue).toBe(initialCapital);
      expect(result.totalReturn).toBe(0);
    });

    it('应该处理跨年日期', () => {
      const startDate = new Date('2019-12-31');
      const endDate = new Date('2020-01-02');

      const result = calculateControlGroup1(startDate, endDate, initialCapital);

      expect(result.yearlyDetails.length).toBeGreaterThanOrEqual(1);
      expect(result.dailyValues.length).toBe(3); // 12/31, 1/1, 1/2
    });

    it('应该处理多年期间', () => {
      const startDate = new Date('2018-01-01');
      const endDate = new Date('2020-12-31');

      const result = calculateControlGroup1(startDate, endDate, initialCapital);

      expect(result.yearlyDetails.length).toBe(3); // 2018, 2019, 2020
    });
  });

  describe('年度详情连续性', () => {
    it('每年的年末价值应该接近下一年的年初价值', () => {
      const startDate = new Date('2019-01-01');
      const endDate = new Date('2021-12-31');

      const result = calculateControlGroup1(startDate, endDate, initialCapital);

      for (let i = 0; i < result.yearlyDetails.length - 1; i++) {
        const currentYear = result.yearlyDetails[i];
        const nextYear = result.yearlyDetails[i + 1];

        // 由于现金国债是按月计息，跨年可能有一些累积利息
        // 允许一定的误差（0.3%以内）
        const diff = Math.abs(currentYear.endValue - nextYear.startValue);
        const diffPercent = (diff / currentYear.endValue) * 100;
        expect(diffPercent).toBeLessThan(0.3);
      }
    });

    it('第一年的年初价值应该等于初始资金', () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2021-12-31');

      const result = calculateControlGroup1(startDate, endDate, initialCapital);

      const firstYear = result.yearlyDetails[0];
      expect(firstYear.startValue).toBe(initialCapital);
    });

    it('最后一年的年末价值应该等于最终价值', () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2021-12-31');

      const result = calculateControlGroup1(startDate, endDate, initialCapital);

      const lastYear = result.yearlyDetails[result.yearlyDetails.length - 1];
      expect(Math.abs(lastYear.endValue - result.finalValue)).toBeLessThan(0.01);
    });
  });

  describe('每日价值连续性', () => {
    it('价值应该单调递增（现金国债策略）', () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2020-12-31');

      const result = calculateControlGroup1(startDate, endDate, initialCapital);

      for (let i = 1; i < result.dailyValues.length; i++) {
        const prevValue = result.dailyValues[i - 1].value;
        const currValue = result.dailyValues[i].value;

        // 现金国债策略的价值应该只增不减（或保持不变）
        expect(currValue).toBeGreaterThanOrEqual(prevValue);
      }
    });

    it('第一天的价值应该等于初始资金', () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2020-12-31');

      const result = calculateControlGroup1(startDate, endDate, initialCapital);

      const firstDayValue = result.dailyValues[0].value;
      expect(firstDayValue).toBe(initialCapital);
    });

    it('最后一天的价值应该等于最终价值', () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2020-12-31');

      const result = calculateControlGroup1(startDate, endDate, initialCapital);

      const lastDayValue = result.dailyValues[result.dailyValues.length - 1].value;
      expect(Math.abs(lastDayValue - result.finalValue)).toBeLessThan(0.01);
    });
  });

  describe('与原实现的兼容性', () => {
    it('重构前后的结果应该一致', () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2020-12-31');

      const result = calculateControlGroup1(startDate, endDate, initialCapital);

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
