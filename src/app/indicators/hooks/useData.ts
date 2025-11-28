import { useState, useEffect, useCallback } from 'react';
import { StockData, ApiResponse, MetricType } from '../types';
import { 
  CSI300_INDEX_STOCK, 
  CSI300_FUND_STOCK, 
  A_STOCK_ALL_STOCK, 
  NATIONAL_DEBT_STOCK 
} from '../constants';

export function useData(selectedMetric: MetricType, years: number = 10) {
  const [data, setData] = useState<Record<string, StockData[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ startDate: string; endDate: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let stockCodes: string[] = [];
      let nationalDebtCodes: string[] = [];
      const codeTypeMap: Record<string, string> = {};
      
      if (selectedMetric === 'csi300-index') {
        // 沪深300指数
        stockCodes = [CSI300_INDEX_STOCK.code];
        codeTypeMap[CSI300_INDEX_STOCK.code] = CSI300_INDEX_STOCK.type;
      } else if (selectedMetric === 'csi300-fund') {
        // 沪深300基金
        stockCodes = [CSI300_FUND_STOCK.code];
        codeTypeMap[CSI300_FUND_STOCK.code] = CSI300_FUND_STOCK.type;
      } else if (selectedMetric === 'a-stock-all') {
        // A股全指
        stockCodes = [A_STOCK_ALL_STOCK.code];
        codeTypeMap[A_STOCK_ALL_STOCK.code] = A_STOCK_ALL_STOCK.type;
      } else if (selectedMetric === 'interest') {
        // 10年期国债
        nationalDebtCodes = [NATIONAL_DEBT_STOCK.code];
      } else if (selectedMetric === 'erp') {
        // 股权风险溢价需要A股全指和国债数据
        stockCodes = [A_STOCK_ALL_STOCK.code];
        nationalDebtCodes = [NATIONAL_DEBT_STOCK.code];
        codeTypeMap[A_STOCK_ALL_STOCK.code] = A_STOCK_ALL_STOCK.type;
      }
      
      // 使用动态年份参数
      const response = await fetch('/api/lixinger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stockCodes: stockCodes.length > 0 ? stockCodes : undefined,
          nationalDebtCodes: nationalDebtCodes.length > 0 ? nationalDebtCodes : undefined,
          codeTypeMap,
          years: years,
          metricsList: (selectedMetric === 'csi300-index' || selectedMetric === 'csi300-fund' || selectedMetric === 'a-stock-all' || selectedMetric === 'erp') 
            ? ['pe_ttm.mcw', 'mc', 'cp'] 
            : undefined,
        }),
      });

      let result: ApiResponse;
      try {
        result = await response.json();
      } catch (jsonError) {
        const text = await response.text();
        throw new Error(`Failed to parse response: ${text.substring(0, 200)}`);
      }

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (!result.success) {
        throw new Error(result.error || 'API request failed');
      }

      // 按代码分组数据
      const groupedData: Record<string, StockData[]> = {};
      const allCodes = [...stockCodes, ...nationalDebtCodes];
      allCodes.forEach(code => {
        groupedData[code] = [];
      });

      result.data.forEach((item: any) => {
        const code = item.stockCode; // API 返回 stockCode 字段
        if (code && groupedData.hasOwnProperty(code)) {
          groupedData[code].push(item);
        }
      });

      // 按日期排序
      Object.keys(groupedData).forEach(code => {
        groupedData[code].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
      });

      setData(groupedData);
      setDateRange(result.dateRange);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMetric, years]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    dateRange,
    fetchData,
  };
}

