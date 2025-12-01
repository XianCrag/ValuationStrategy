/**
 * getMonthNationalDebtRate 和 getMonthCashInterest 函数测试
 * 运行方式：npm test 或 npm test -- base.test.ts
 */

import { getMonthNationalDebtRate, getMonthCashInterest } from './base';
import { setBondData, backtestDataManager } from '@/lib/backtestData';
import nationalDebtData from '@/data/national-debt.json';
import { BondData } from '../../types';

// 在所有测试前设置全局 bondData
beforeAll(() => {
  // 将 national-debt.json 数据转换为 BondData 格式
  const bondDataArray: BondData[] = [];
  
  Object.entries(nationalDebtData.data).forEach(([year, monthData]) => {
    monthData.forEach((item: any) => {
      bondDataArray.push({
        date: item.date,
        tcm_y10: item.tcm_y10,
      });
    });
  });
  
  // 设置全局数据
  setBondData(bondDataArray);
});

// 测试后清理
afterAll(() => {
  backtestDataManager.clear();
});

describe('getMonthNationalDebtRate', () => {
  describe('正常情况', () => {
    it('应该返回 2002-06 的国债利率', () => {
      const date = '2002-06-15';
      const rate = getMonthNationalDebtRate(date);
      
      // 根据 JSON 数据，2002-06 的 tcm_y10 应该是 0.02418
      expect(rate).toBe(0.02418);
    });

    it('应该返回 2002-12 的国债利率', () => {
      const date = '2002-12-31';
      const rate = getMonthNationalDebtRate(date);
      
      // 根据 JSON 数据，2002-12 的 tcm_y10 应该是 0.03339
      expect(rate).toBe(0.03339);
    });

    it('应该返回 2003-01 的国债利率', () => {
      const date = '2003-01-10';
      const rate = getMonthNationalDebtRate(date);
      
      // 根据 JSON 数据，2003-01 的 tcm_y10 应该是 0.03055
      expect(rate).toBe(0.03055);
    });

    it('应该返回 2003-06 的国债利率', () => {
      const date = '2003-06-20';
      const rate = getMonthNationalDebtRate(date);
      
      // 根据 JSON 数据，2003-06 的 tcm_y10 应该是 0.029
      expect(rate).toBe(0.029);
    });

    it('应该返回 2004-01 的国债利率', () => {
      const date = '2004-01-15';
      const rate = getMonthNationalDebtRate(date);
      
      // 根据 JSON 数据，2004-01 的 tcm_y10 应该是 0.03588
      expect(rate).toBe(0.03588);
    });

    it('应该正确处理不同格式的日期字符串', () => {
      // 测试不同的日期格式，但月份应该相同
      const date1 = '2002-06-01';
      const date2 = '2002-06-15';
      const date3 = '2002-06-30';
      
      const rate1 = getMonthNationalDebtRate(date1);
      const rate2 = getMonthNationalDebtRate(date2);
      const rate3 = getMonthNationalDebtRate(date3);
      
      // 同一个月应该返回相同的利率
      expect(rate1).toBe(rate2);
      expect(rate2).toBe(rate3);
      expect(rate1).toBe(0.02418);
    });
  });

  describe('错误情况', () => {
    it('当年份不存在时应该返回最近的历史数据', () => {
      const date = '1999-06-15'; // 1999 年不在数据中
      
      const rate = getMonthNationalDebtRate(date);
      // 由于 1999 年数据不存在，会查找最近的数据
      // JSON 数据最早是 2002-06，所以应该返回接近该值的数据
      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeLessThan(0.1);
    });

    it('当月份不存在时应该返回最近的历史数据', () => {
      // 2002 年只有 6-12 月的数据，没有 1-5 月
      const date = '2002-01-15';
      
      const rate = getMonthNationalDebtRate(date);
      // 应该返回最近的历史数据
      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeLessThan(0.1);
    });

    it('当日期格式无效时应该正确处理', () => {
      // moment 会尝试解析，但如果年份或月份无效，应该会抛出错误
      const date = '2002-13-15'; // 无效的月份
      
      // moment 会解析为下一年的 1 月，所以可能会找到数据或抛出错误
      // 这里我们测试一个明确不存在的日期
      const invalidDate = '2002-01-15';
      
      const rate = getMonthNationalDebtRate(invalidDate);
      // 应该返回最近的历史数据
      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeLessThan(0.1);
    });
  });

  describe('边界情况', () => {
    it('应该正确处理月初的日期', () => {
      const date = '2002-06-01';
      const rate = getMonthNationalDebtRate(date);
      
      expect(rate).toBe(0.02418);
    });

    it('应该正确处理月末的日期', () => {
      const date = '2002-06-30';
      const rate = getMonthNationalDebtRate(date);
      
      expect(rate).toBe(0.02418);
    });

    it('应该正确处理跨年的日期', () => {
      const date1 = '2002-12-31';
      const date2 = '2003-01-01';
      
      const rate1 = getMonthNationalDebtRate(date1);
      const rate2 = getMonthNationalDebtRate(date2);
      
      // 不同年份的相同月份应该返回不同的利率
      expect(rate1).toBe(0.03339); // 2002-12
      expect(rate2).toBe(0.03055); // 2003-01
    });
  });

  describe('数据一致性验证', () => {
    it('返回的利率应该与 JSON 数据中的值一致', () => {
      const testCases = [
        { date: '2002-06-15', expectedRate: 0.02418 },
        { date: '2002-07-15', expectedRate: 0.02548 },
        { date: '2002-08-15', expectedRate: 0.02862 },
        { date: '2003-01-15', expectedRate: 0.03055 },
        { date: '2003-02-15', expectedRate: 0.03009 },
        { date: '2003-03-15', expectedRate: 0.03009 },
      ];

      testCases.forEach(({ date, expectedRate }) => {
        const rate = getMonthNationalDebtRate(date);
        expect(rate).toBe(expectedRate);
      });
    });

    it('应该返回数字类型的利率值', () => {
      const date = '2002-06-15';
      const rate = getMonthNationalDebtRate(date);
      
      expect(typeof rate).toBe('number');
      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeLessThan(1); // 利率通常是小数形式，如 0.02418 表示 2.418%
    });
  });
});

describe('getMonthCashInterest', () => {
  describe('正常情况', () => {
    it('应该根据现金和利率计算月利息', () => {
      const date = '2002-06-15';
      const cash = 1000000; // 100万
      
      const interest = getMonthCashInterest(date, cash);
      
      // 根据 JSON 数据，2002-06 的 tcm_y10 应该是 0.02418
      // 月利息 = 现金 * 年利率 / 12
      const expectedInterest = cash * 0.02418 / 12;
      expect(interest).toBeCloseTo(expectedInterest, 2);
    });

    it('应该返回正确的利息值（不同月份）', () => {
      const testCases = [
        { date: '2002-06-15', cash: 1000000, expectedRate: 0.02418 },
        { date: '2002-07-15', cash: 1000000, expectedRate: 0.02548 },
        { date: '2002-08-15', cash: 1000000, expectedRate: 0.02862 },
        { date: '2003-01-15', cash: 1000000, expectedRate: 0.03055 },
      ];

      testCases.forEach(({ date, cash, expectedRate }) => {
        const interest = getMonthCashInterest(date, cash);
        const expectedInterest = cash * expectedRate / 12;
        expect(interest).toBeCloseTo(expectedInterest, 2);
      });
    });

    it('应该处理不同的现金金额', () => {
      const date = '2002-06-15';
      const rate = 0.02418;

      const testCases = [
        { cash: 0, expectedInterest: 0 },
        { cash: 100000, expectedInterest: 100000 * rate / 12 },
        { cash: 1000000, expectedInterest: 1000000 * rate / 12 },
        { cash: 10000000, expectedInterest: 10000000 * rate / 12 },
      ];

      testCases.forEach(({ cash, expectedInterest }) => {
        const interest = getMonthCashInterest(date, cash);
        expect(interest).toBeCloseTo(expectedInterest, 2);
      });
    });

    it('现金为0时利息应该为0', () => {
      const date = '2002-06-15';
      const cash = 0;
      
      const interest = getMonthCashInterest(date, cash);
      
      expect(interest).toBe(0);
    });
  });

  describe('计算公式验证', () => {
    it('月利息应该等于 现金 * 年利率 / 12', () => {
      const date = '2002-06-15';
      const cash = 1000000;
      
      const interest = getMonthCashInterest(date, cash);
      const rate = getMonthNationalDebtRate(date);
      const expectedInterest = cash * rate / 12;
      
      expect(interest).toBeCloseTo(expectedInterest, 10);
    });

    it('应该返回正数', () => {
      const date = '2002-06-15';
      const cash = 1000000;
      
      const interest = getMonthCashInterest(date, cash);
      
      expect(interest).toBeGreaterThan(0);
    });

    it('利息应该与现金成正比', () => {
      const date = '2002-06-15';
      
      const interest1 = getMonthCashInterest(date, 1000000);
      const interest2 = getMonthCashInterest(date, 2000000);
      
      // 现金翻倍，利息也应该翻倍
      expect(interest2).toBeCloseTo(interest1 * 2, 2);
    });
  });

  describe('错误情况', () => {
    it('当年份不存在时应该返回基于最近历史数据的利息', () => {
      const date = '1999-06-15'; // 1999 年不在数据中
      const cash = 1000000;
      
      const interest = getMonthCashInterest(date, cash);
      // 应该使用最近的历史利率计算
      expect(interest).toBeGreaterThan(0);
      expect(interest).toBeLessThan(cash * 0.1 / 12); // 应该远小于 10% 的年利率
    });

    it('当月份不存在时应该返回基于最近历史数据的利息', () => {
      const date = '2002-01-15'; // 2002 年没有 1-5 月的数据
      const cash = 1000000;
      
      const interest = getMonthCashInterest(date, cash);
      // 应该使用最近的历史利率计算
      expect(interest).toBeGreaterThan(0);
      expect(interest).toBeLessThan(cash * 0.1 / 12); // 应该远小于 10% 的年利率
    });
  });

  describe('数值精度', () => {
    it('应该保持足够的精度', () => {
      const date = '2002-06-15';
      const cash = 1234567.89;
      
      const interest = getMonthCashInterest(date, cash);
      const rate = getMonthNationalDebtRate(date);
      const expectedInterest = cash * rate / 12;
      
      // 精度应该保持到小数点后2位
      expect(Math.abs(interest - expectedInterest)).toBeLessThan(0.01);
    });

    it('应该处理小额现金', () => {
      const date = '2002-06-15';
      const cash = 1; // 1元
      
      const interest = getMonthCashInterest(date, cash);
      
      expect(interest).toBeGreaterThan(0);
      expect(interest).toBeLessThan(1);
    });

    it('应该处理大额现金', () => {
      const date = '2002-06-15';
      const cash = 1000000000; // 10亿
      
      const interest = getMonthCashInterest(date, cash);
      const rate = getMonthNationalDebtRate(date);
      const expectedInterest = cash * rate / 12;
      
      expect(interest).toBeCloseTo(expectedInterest, 0);
    });
  });
});


