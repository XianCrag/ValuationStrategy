import { useState, useEffect, useCallback } from 'react';
import { StockData, ApiResponse, MetricType } from '../types';
import { WATCHED_STOCKS, NATIONAL_DEBT_STOCKS } from '../constants';

export function useStrategyData(selectedMetric: MetricType) {
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
      
      if (selectedMetric === 'index') {
        stockCodes = WATCHED_STOCKS.map(s => s.code);
        WATCHED_STOCKS.forEach(s => {
          codeTypeMap[s.code] = s.type || 'stock';
        });
      } else if (selectedMetric === 'interest') {
        nationalDebtCodes = NATIONAL_DEBT_STOCKS.map(s => s.code);
      }
      
      const response = await fetch('/api/lixinger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stockCodes: stockCodes.length > 0 ? stockCodes : undefined,
          nationalDebtCodes: nationalDebtCodes.length > 0 ? nationalDebtCodes : undefined,
          codeTypeMap,
          years: 10,
          metricsList: selectedMetric === 'index' ? ['pe_ttm.mcw', 'mc'] : undefined, // 指数：PE按市值加权、总市值；国债：使用默认指标
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
      const codesToTrack = selectedMetric === 'index' ? stockCodes : nationalDebtCodes;
      codesToTrack.forEach(code => {
        groupedData[code] = [];
      });

      result.data.forEach((item: any) => {
        const code = item.stockCode; // API 返回 stockCode 字段
        if (code && groupedData[code]) {
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
  }, [selectedMetric]);

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

