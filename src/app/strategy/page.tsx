'use client';

import { useState, useEffect } from 'react';

interface StockData {
  date: string;
  marketValue?: number;
  pe_ttm?: number;
  [key: string]: any;
}

interface ApiResponse {
  success: boolean;
  data: StockData[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
  error?: string;
}

// 关注的标的配置
const WATCHED_STOCKS = [
  { code: '000300', name: '沪深300指数' }, // 沪深300指数
];

export default function StrategyPage() {
  const [data, setData] = useState<Record<string, StockData[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ startDate: string; endDate: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const stockCodes = WATCHED_STOCKS.map(s => s.code);
      
      const response = await fetch('/api/lixinger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stockCodes,
          years: 10,
          metricsList: ['pe_ttm.y10.mcw.cvpos'],
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
      stockCodes.forEach(code => {
        groupedData[code] = [];
      });

      result.data.forEach((item: any) => {
        const code = item.stockCode; // 指数 API 返回 stockCode 字段
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
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatNumber = (num?: number): string => {
    if (num === undefined || num === null) return 'N/A';
    if (num >= 100000000) {
      return (num / 100000000).toFixed(2) + '亿';
    }
    if (num >= 10000) {
      return (num / 10000).toFixed(2) + '万';
    }
    return num.toFixed(2);
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            策略回测 - 关注标的数据
          </h1>
          <p className="text-lg text-gray-600">
            展示最近10年的PE TTM (10年分位) 数据
          </p>
        </div>

        {dateRange && (
          <div className="mb-4 text-center text-sm text-gray-500">
            数据时间范围: {formatDate(dateRange.startDate)} 至 {formatDate(dateRange.endDate)}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-6 mb-6">
            <h3 className="text-lg font-semibold text-red-800 mb-2">配置错误</h3>
            <p className="text-red-700 whitespace-pre-line mb-4">{error}</p>
            <div className="bg-white border border-red-200 rounded p-4 mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">配置步骤：</p>
              <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                <li>在项目根目录找到 <code className="bg-gray-100 px-1 rounded">.env.local</code> 文件</li>
                <li>添加或修改：<code className="bg-gray-100 px-1 rounded">LIXINGER_TOKEN=your_actual_token</code></li>
                <li>从 <a href="https://open.lixinger.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">理杏仁开放平台</a> 获取你的 Token</li>
                <li>重启开发服务器：<code className="bg-gray-100 px-1 rounded">npm run dev</code></li>
              </ol>
            </div>
            <button
              onClick={fetchData}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              重试
            </button>
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">加载中...</p>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-8">
            {WATCHED_STOCKS.map((stock) => {
              const stockData = data[stock.code] || [];
              
              return (
                <div key={stock.code} className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                    {stock.name} ({stock.code})
                  </h2>
                  
                  {stockData.length === 0 ? (
                    <p className="text-gray-500">暂无数据</p>
                  ) : (
                    <>
                      {/* 数据统计 */}
                      <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
                        <div className="bg-green-50 p-4 rounded-lg">
                          <h3 className="text-sm font-medium text-green-900 mb-2">最新PE TTM (10年分位)</h3>
                          <p className="text-2xl font-bold text-green-600">
                            {stockData[stockData.length - 1]?.['pe_ttm.y10.mcw.cvpos']?.toFixed(4) || 'N/A'}
                          </p>
                        </div>
                      </div>

                      {/* 数据表格 */}
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                日期
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                PE TTM (10年分位)
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {stockData.slice(-20).reverse().map((item, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {formatDate(item.date)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {item['pe_ttm.y10.mcw.cvpos']?.toFixed(4) || 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {stockData.length > 20 && (
                          <p className="mt-2 text-sm text-gray-500 text-center">
                            仅显示最近20条记录，共 {stockData.length} 条
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={fetchData}
            disabled={loading}
            className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '加载中...' : '刷新数据'}
          </button>
        </div>
      </div>
    </div>
  );
}

