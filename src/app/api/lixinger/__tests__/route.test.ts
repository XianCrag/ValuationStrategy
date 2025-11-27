/**
 * Lixinger API 路由测试
 */

import { POST } from '../route';
import { NextRequest } from 'next/server';

// Mock Lixinger 库
jest.mock('@/lib/lixinger', () => ({
  getNonFinancialData: jest.fn(),
  getIndexFundamentalData: jest.fn(),
  getNationalDebtData: jest.fn(),
  getDateRangeForYears: jest.fn(() => ({
    startDate: '2015-01-01',
    endDate: '2025-01-01',
  })),
}));

import {
  getNonFinancialData,
  getIndexFundamentalData,
  getNationalDebtData,
} from '@/lib/lixinger';

const mockGetNonFinancialData = getNonFinancialData as jest.MockedFunction<typeof getNonFinancialData>;
const mockGetIndexFundamentalData = getIndexFundamentalData as jest.MockedFunction<typeof getIndexFundamentalData>;
const mockGetNationalDebtData = getNationalDebtData as jest.MockedFunction<typeof getNationalDebtData>;

describe('Lixinger API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 重置 console.error mock
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/lixinger', () => {
    it('应该返回错误当没有提供 stockCodes 或 nationalDebtCodes', async () => {
      const request = new NextRequest('http://localhost/api/lixinger', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('stockCodes or nationalDebtCodes is required');
      expect(data.success).toBeUndefined();
    });

    it('应该成功获取股票数据', async () => {
      const mockStockData = [
        {
          date: '2024-01-01',
          stockCode: '000001',
          pe_ttm: 10.5,
          mc: 1000000000,
        },
      ];

      mockGetNonFinancialData.mockResolvedValue(mockStockData as any);

      const request = new NextRequest('http://localhost/api/lixinger', {
        method: 'POST',
        body: JSON.stringify({
          stockCodes: ['000001'],
          codeTypeMap: { '000001': 'stock' },
          years: 10,
          metricsList: ['pe_ttm', 'mc'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.length).toBeGreaterThan(0);
      expect(data.dateRange).toBeDefined();
      expect(mockGetNonFinancialData).toHaveBeenCalled();
    });

    it('应该成功获取指数数据', async () => {
      const mockIndexData = [
        {
          date: '2024-01-01',
          stockCode: '000300',
          'pe_ttm.mcw': 12.5,
          cp: 3500,
          mc: 50000000000,
        },
      ];

      mockGetIndexFundamentalData.mockResolvedValue(mockIndexData as any);

      const request = new NextRequest('http://localhost/api/lixinger', {
        method: 'POST',
        body: JSON.stringify({
          stockCodes: ['000300'],
          codeTypeMap: { '000300': 'index' },
          years: 10,
          metricsList: ['pe_ttm.mcw', 'cp', 'mc'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(mockGetIndexFundamentalData).toHaveBeenCalled();
    });

    it('应该成功获取国债数据', async () => {
      const mockBondData = [
        {
          date: '2024-01-01',
          tcm_y10: 0.035,
        },
      ];

      mockGetNationalDebtData.mockResolvedValue(mockBondData as any);

      const request = new NextRequest('http://localhost/api/lixinger', {
        method: 'POST',
        body: JSON.stringify({
          nationalDebtCodes: ['tcm_y10'],
          years: 10,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(mockGetNationalDebtData).toHaveBeenCalled();
    });

    it('应该同时获取股票和国债数据', async () => {
      const mockStockData = [
        {
          date: '2024-01-01',
          stockCode: '000300',
          'pe_ttm.mcw': 12.5,
          cp: 3500,
        },
      ];
      const mockBondData = [
        {
          date: '2024-01-01',
          tcm_y10: 0.035,
        },
      ];

      mockGetIndexFundamentalData.mockResolvedValue(mockStockData as any);
      mockGetNationalDebtData.mockResolvedValue(mockBondData as any);

      const request = new NextRequest('http://localhost/api/lixinger', {
        method: 'POST',
        body: JSON.stringify({
          stockCodes: ['000300'],
          codeTypeMap: { '000300': 'index' },
          nationalDebtCodes: ['tcm_y10'],
          years: 10,
          metricsList: ['pe_ttm.mcw', 'cp'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.length).toBe(2);
      expect(mockGetIndexFundamentalData).toHaveBeenCalled();
      expect(mockGetNationalDebtData).toHaveBeenCalled();
    });

    it('应该处理 API 错误', async () => {
      mockGetNonFinancialData.mockRejectedValue(new Error('API Error'));

      const request = new NextRequest('http://localhost/api/lixinger', {
        method: 'POST',
        body: JSON.stringify({
          stockCodes: ['000001'],
          years: 10,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('API Error');
    });

    it('应该映射 marketValue 字段', async () => {
      const mockStockData = [
        {
          date: '2024-01-01',
          stockCode: '000001',
          mc: 1000000000,
        },
      ];

      mockGetNonFinancialData.mockResolvedValue(mockStockData as any);

      const request = new NextRequest('http://localhost/api/lixinger', {
        method: 'POST',
        body: JSON.stringify({
          stockCodes: ['000001'],
          years: 10,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.data[0].marketValue).toBe(1000000000);
      expect(data.data[0].mc).toBe(1000000000);
    });
  });
});

