import { useState, useEffect, useCallback, useRef } from 'react';
import { StockData } from '../types';
import { fetchLixingerData, StockType } from '@/lib/api';

/**
 * 用于加载单个股票数据的 Hook
 * 只在需要时加载指定股票的数据
 */
export function useIndividualStockData(stockCode: string | null, years: number = 10) {
  const [data, setData] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 使用 ref 来缓存已加载的数据，避免重复请求
  const cacheRef = useRef<Map<string, StockData[]>>(new Map());

  const fetchData = useCallback(async () => {
    if (!stockCode) {
      setData([]);
      return;
    }

    const cacheKey = `${stockCode}-${years}`;

    // 检查缓存
    if (cacheRef.current.has(cacheKey)) {
      console.log(`使用缓存数据: ${stockCode}`);
      setData(cacheRef.current.get(cacheKey)!);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`加载个股数据: ${stockCode}`);

      // API 会根据 codeTypeMap 自动选择个股指标
      const allData = await fetchLixingerData({
        stockCodes: [stockCode],
        codeTypeMap: { [stockCode]: StockType.STOCK },
        years: years,
      });

      // 过滤出当前股票的数据并排序
      const stockData = allData
        .filter((item: any) => item.stockCode === stockCode)
        .sort((a: any, b: any) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );

      // 更新缓存
      cacheRef.current.set(cacheKey, stockData);
      setData(stockData);

      console.log(`个股数据加载完成: ${stockCode}, 共 ${stockData.length} 条数据`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching individual stock data:', err);
    } finally {
      setLoading(false);
    }
  }, [stockCode, years]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

