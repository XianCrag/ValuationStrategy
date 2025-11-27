/**
 * Valuation API 路由测试
 */

import { POST } from '../route';
import { NextRequest } from 'next/server';

describe('Valuation API Route', () => {
  beforeEach(() => {
    // Mock console.error
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/valuation', () => {
    it('应该返回错误当没有提供 freeCashFlow', async () => {
      const request = new NextRequest('http://localhost/api/valuation', {
        method: 'POST',
        body: JSON.stringify({
          growthRate: 0.1,
          discountRate: 0.12,
          terminalGrowthRate: 0.03,
          years: 5,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Free cash flow array is required');
    });

    it('应该返回错误当 discountRate 小于等于0', async () => {
      const request = new NextRequest('http://localhost/api/valuation', {
        method: 'POST',
        body: JSON.stringify({
          freeCashFlow: [100, 110, 120],
          growthRate: 0.1,
          discountRate: 0,
          terminalGrowthRate: 0.03,
          years: 5,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Discount rate must be positive');
    });

    it('应该成功计算 DCF 估值', async () => {
      const request = new NextRequest('http://localhost/api/valuation', {
        method: 'POST',
        body: JSON.stringify({
          freeCashFlow: [100, 110, 120],
          growthRate: 0.1,
          discountRate: 0.12,
          terminalGrowthRate: 0.03,
          years: 5,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.presentValue).toBeDefined();
      expect(data.terminalValue).toBeDefined();
      expect(data.totalValue).toBeDefined();
      expect(data.yearByYear).toBeDefined();
      expect(data.yearByYear.length).toBe(5);
    });

    it('应该正确计算现值', async () => {
      const request = new NextRequest('http://localhost/api/valuation', {
        method: 'POST',
        body: JSON.stringify({
          freeCashFlow: [100],
          growthRate: 0,
          discountRate: 0.1,
          terminalGrowthRate: 0.03,
          years: 1,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // 第一年现值 = 100 / (1 + 0.1) = 90.91
      expect(data.presentValue).toBeCloseTo(90.91, 1);
      expect(data.totalValue).toBeGreaterThan(data.presentValue);
    });

    it('应该包含每年的详细数据', async () => {
      const request = new NextRequest('http://localhost/api/valuation', {
        method: 'POST',
        body: JSON.stringify({
          freeCashFlow: [100, 110],
          growthRate: 0.1,
          discountRate: 0.12,
          terminalGrowthRate: 0.03,
          years: 3,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.yearByYear.length).toBe(3);
      data.yearByYear.forEach((year: any) => {
        expect(year.year).toBeDefined();
        expect(year.fcf).toBeDefined();
        expect(year.presentValue).toBeDefined();
      });
    });

    it('应该处理错误情况', async () => {
      const request = new NextRequest('http://localhost/api/valuation', {
        method: 'POST',
        body: JSON.stringify({
          freeCashFlow: [100],
          growthRate: 0.1,
          discountRate: 0.12,
          terminalGrowthRate: 0.03,
          years: 5,
        }),
      });

      // Mock 一个会抛出错误的场景
      const invalidRequest = new NextRequest('http://localhost/api/valuation', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(invalidRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});

