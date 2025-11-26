'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

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
  { code: '000300', name: '沪深300指数', type: 'index' }, // 沪深300指数
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
      // 创建 code 到 type 的映射
      const codeTypeMap: Record<string, string> = {};
      WATCHED_STOCKS.forEach(s => {
        codeTypeMap[s.code] = s.type || 'stock';
      });
      
      const response = await fetch('/api/lixinger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stockCodes,
          codeTypeMap,
          years: 10,
          metricsList: ['pe_ttm.mcw', 'mc'], // PE按市值加权、总市值
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
    if (num >= 1000000000000) {
      return (num / 1000000000000).toFixed(2) + '万亿';
    }
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

  const formatDateShort = (dateStr: string): string => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            策略回测 - 关注标的数据
          </h1>
          <p className="text-lg text-gray-600">
            展示最近10年的PE TTM (市值加权) 和总市值数据
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
                  ) : (() => {
                      // 计算数据范围，用于设置Y轴domain
                      const peTtmValues = stockData
                        .map(item => item['pe_ttm.mcw'])
                        .filter((val): val is number => val !== null && val !== undefined);
                      
                      // 判断市值是否需要使用万亿单位
                      const rawMarketCapValues = stockData
                        .map(item => item.mc)
                        .filter((val): val is number => val !== null && val !== undefined);
                      const maxMarketCap = rawMarketCapValues.length > 0 ? Math.max(...rawMarketCapValues) : 0;
                      const useTrillion = maxMarketCap >= 1000000000000; // 大于等于1万亿
                      const marketCapDivisor = useTrillion ? 1000000000000 : 100000000;
                      const marketCapUnit = useTrillion ? '万亿' : '亿';
                      
                      const marketCapValues = rawMarketCapValues.map(val => val / marketCapDivisor);

                      // 计算PE TTM的范围（最小值-10%，最大值+10%）
                      const peTtmMin = peTtmValues.length > 0 ? Math.min(...peTtmValues) : 0;
                      const peTtmMax = peTtmValues.length > 0 ? Math.max(...peTtmValues) : 0;
                      const peTtmRange = peTtmMax - peTtmMin;
                      const peTtmDomain = [
                        Math.max(0, peTtmMin - peTtmRange * 0.1),
                        peTtmMax + peTtmRange * 0.1
                      ];

                      // 计算总市值的范围（最小值-10%，最大值+10%）
                      const marketCapMin = marketCapValues.length > 0 ? Math.min(...marketCapValues) : 0;
                      const marketCapMax = marketCapValues.length > 0 ? Math.max(...marketCapValues) : 0;
                      const marketCapRange = marketCapMax - marketCapMin;
                      const marketCapDomain = [
                        Math.max(0, marketCapMin - marketCapRange * 0.1),
                        marketCapMax + marketCapRange * 0.1
                      ];

                      return (
                        <>
                          {/* 数据统计 */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div className="bg-green-50 p-4 rounded-lg">
                              <h3 className="text-sm font-medium text-green-900 mb-2">PE TTM (市值加权)</h3>
                              <p className="text-2xl font-bold text-green-600">
                                {stockData[stockData.length - 1]?.['pe_ttm.mcw']?.toFixed(2) || 'N/A'}
                              </p>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <h3 className="text-sm font-medium text-blue-900 mb-2">总市值</h3>
                              <p className="text-2xl font-bold text-blue-600">
                                {formatNumber(stockData[stockData.length - 1]?.mc)}
                              </p>
                            </div>
                          </div>

                          {/* 合并趋势图 */}
                          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">PE TTM 与总市值趋势</h3>
                            <ResponsiveContainer width="100%" height={400}>
                              <LineChart
                                data={stockData.map((item, index) => ({
                                  date: item.date, // 使用完整日期作为唯一标识
                                  dateShort: formatDateShort(item.date), // 用于显示
                                  fullDate: formatDate(item.date),
                                  peTtm: item['pe_ttm.mcw'],
                                  marketCap: item.mc ? item.mc / marketCapDivisor : null,
                                  rawMarketCap: item.mc, // 保留原始值用于 Tooltip
                                  index, // 保留索引作为备用标识
                                }))}
                                margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                  dataKey="date"
                                  angle={-45}
                                  textAnchor="end"
                                  height={80}
                                  interval={Math.floor(stockData.length / 10)}
                                  tickFormatter={(value) => {
                                    // 从完整日期中提取并格式化显示
                                    const item = stockData.find(d => d.date === value);
                                    return item ? formatDateShort(item.date) : value;
                                  }}
                                />
                                <YAxis
                                  yAxisId="left"
                                  domain={peTtmDomain}
                                  label={{ value: 'PE TTM', angle: -90, position: 'insideLeft' }}
                                  tickFormatter={(value) => value.toFixed(2)}
                                />
                                <YAxis
                                  yAxisId="right"
                                  orientation="right"
                                  domain={marketCapDomain}
                                  label={{ value: `总市值 (${marketCapUnit})`, angle: 90, position: 'insideRight' }}
                                  tickFormatter={(value) => value.toFixed(2)}
                                />
                            <Tooltip
                              formatter={(value: any, name: string, props: any) => {
                                if (name === 'peTtm') {
                                  const numValue = typeof value === 'number' ? value : null;
                                  return numValue !== null && !isNaN(numValue)
                                    ? [numValue.toFixed(2), 'PE TTM (市值加权)']
                                    : ['N/A', 'PE TTM (市值加权)'];
                                }
                                if (name === 'marketCap') {
                                  // 使用原始市值值来格式化
                                  const rawValue = props.payload?.rawMarketCap;
                                  if (rawValue !== null && rawValue !== undefined && typeof rawValue === 'number') {
                                    return [formatNumber(rawValue), '总市值'];
                                  }
                                  // 如果没有原始值，使用转换后的值
                                  const numValue = typeof value === 'number' ? value : null;
                                  if (numValue !== null && !isNaN(numValue)) {
                                    return [`${numValue.toFixed(2)} ${marketCapUnit}`, '总市值'];
                                  }
                                  return ['N/A', '总市值'];
                                }
                                const numValue = typeof value === 'number' ? value : null;
                                return numValue !== null && !isNaN(numValue) ? [numValue.toFixed(2), name] : ['N/A', name];
                              }}
                              labelFormatter={(label, payload) => {
                                // 直接使用 payload 中的数据，确保精确匹配
                                if (payload && payload.length > 0 && payload[0].payload) {
                                  const dataPoint = payload[0].payload;
                                  if (dataPoint.fullDate) {
                                    return `日期: ${dataPoint.fullDate}`;
                                  }
                                  // 如果label是完整日期，直接格式化
                                  if (typeof label === 'string' && label.includes('-')) {
                                    return `日期: ${formatDate(label)}`;
                                  }
                                }
                                // 备用方案：通过完整日期查找
                                const dataPoint = stockData.find(item => item.date === label);
                                return dataPoint ? `日期: ${formatDate(dataPoint.date)}` : `日期: ${label}`;
                              }}
                            />
                            <Legend />
                            <Line
                              yAxisId="left"
                              type="monotone"
                              dataKey="peTtm"
                              stroke="#10b981"
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 6 }}
                              name="PE TTM (市值加权)"
                            />
                            <Line
                              yAxisId="right"
                              type="monotone"
                              dataKey="marketCap"
                              stroke="#3b82f6"
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 6 }}
                              name={`总市值 (${marketCapUnit})`}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                        </>
                      );
                    })()}
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

