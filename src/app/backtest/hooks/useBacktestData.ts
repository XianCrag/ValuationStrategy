import { useState, useEffect, useCallback } from 'react';

interface UseBacktestDataOptions<TData, TResult> {
  /** 数据获取函数 */
  fetchData: () => Promise<TData>;
  /** 计算函数 */
  calculateResult: (data: TData) => TResult;
  /** 依赖项数组，当这些值变化时重新获取数据 */
  dependencies: any[];
  /** 是否自动获取数据，默认为 true */
  autoFetch?: boolean;
}

interface UseBacktestDataReturn<TData, TResult> {
  /** 原始数据 */
  data: TData | null;
  /** 计算结果 */
  result: TResult | null;
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 手动重新获取数据 */
  refetch: () => Promise<void>;
}

/**
 * 回测数据获取自定义Hook
 * 统一处理数据获取、计算、加载状态和错误处理
 */
export function useBacktestData<TData, TResult>({
  fetchData,
  calculateResult,
  dependencies,
  autoFetch = true,
}: UseBacktestDataOptions<TData, TResult>): UseBacktestDataReturn<TData, TResult> {
  const [data, setData] = useState<TData | null>(null);
  const [result, setResult] = useState<TResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const fetchedData = await fetchData();
      setData(fetchedData);

      // 计算结果
      const calculatedResult = calculateResult(fetchedData);
      setResult(calculatedResult);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error fetching backtest data:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchData, calculateResult]);

  // 当依赖项变化时自动获取数据（如果启用了自动获取）
  useEffect(() => {
    if (autoFetch) {
      fetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return {
    data,
    result,
    loading,
    error,
    refetch: fetch,
  };
}
