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
import { StockData, ApiResponse, StrategyResult } from '../types';
import { INITIAL_CAPITAL, CSI300_FUND_CODE } from '../constants';
import { calculateStrategy } from './calculations';
import { formatNumber, formatDateShort } from '../utils';
import StrategyLayout from '../../components/Layout';
import YearSelector from '../../components/YearSelector';

export default function BacktestPage() {
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [strategyResult, setStrategyResult] = useState<StrategyResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedYears, setSelectedYears] = useState<number>(10);

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYears]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // 获取沪深300指数数据（包含PE）和基金数据（包含价格）
      // 策略使用本地 national-debt.json 的利率数据，无需请求国债数据
      const [indexResponse, fundResponse] = await Promise.all([
        // 获取指数PE数据
        fetch('/api/lixinger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stockCodes: ['000300'], // 沪深300指数
            codeTypeMap: { '000300': 'index' },
            years: selectedYears,
            metricsList: ['pe_ttm.mcw'],
          }),
        }),
        // 获取基金价格数据
        fetch('/api/lixinger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stockCodes: [CSI300_FUND_CODE],
            codeTypeMap: { [CSI300_FUND_CODE]: 'fund' },
            years: selectedYears,
            metricsList: ['cp'],
          }),
        }),
      ]);

      const indexResult: ApiResponse = await indexResponse.json();
      const fundResult: ApiResponse = await fundResponse.json();

      if (!indexResult.success || !fundResult.success) {
        throw new Error(indexResult.error || fundResult.error || 'Failed to fetch data');
      }

      // 合并指数PE和基金价格数据
      const indexData = indexResult.data as StockData[];
      const fundData = fundResult.data as StockData[];
      
      // 创建日期到PE的映射
      const peMap = new Map<string, number>();
      indexData.forEach(item => {
        if (item['pe_ttm.mcw']) {
          peMap.set(item.date, item['pe_ttm.mcw']);
        }
      });

      // 合并数据：使用基金价格 + 指数PE
      const mergedData = fundData
        .map(fundItem => ({
          ...fundItem,
          'pe_ttm.mcw': peMap.get(fundItem.date),
        }))
        .filter(item => item['pe_ttm.mcw'] !== undefined) // 过滤掉没有PE数据的日期
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setStockData(mergedData);

      // 计算策略结果（使用本地 national-debt.json 的利率数据）
      const result = calculateStrategy(mergedData, INITIAL_CAPITAL);
      setStrategyResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const chartData = stockData
    .map(item => {
      const trade = strategyResult?.trades.find(t => t.date === item.date);
      const dailyState = strategyResult?.dailyStates.find(s => s.date === item.date);
      return {
        date: item.date,
        dateShort: formatDateShort(item.date),
        pe: item['pe_ttm.mcw'],
        marketCap: item.mc,
        hasTrade: !!trade,
        tradeType: trade?.type,
        stockRatio: trade?.stockRatio ?? dailyState?.stockRatio ?? 0,
        bondRatio: trade?.bondRatio ?? dailyState?.bondRatio ?? 0,
        stockValue: trade?.stockValue ?? dailyState?.stockValue ?? 0,
        bondValue: trade?.bondValue ?? dailyState?.bondValue ?? 0,
        totalValue: trade?.totalValue ?? dailyState?.totalValue ?? 0,
        changePercent: trade?.changePercent ?? dailyState?.changePercent ?? 0,
        annualizedReturn: trade?.annualizedReturn ?? dailyState?.annualizedReturn ?? 0,
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const peValues = chartData
    .map(d => d.pe)
    .filter((val): val is number => val !== null && val !== undefined);
  const marketCapValues = chartData
    .map(d => d.marketCap)
    .filter((val): val is number => val !== null && val !== undefined);
  
  const peMin = peValues.length > 0 ? Math.min(...peValues) : 0;
  const peMax = peValues.length > 0 ? Math.max(...peValues) : 0;
  const peRange = peMax - peMin;
  const peDomain = [
    Math.max(0, peMin - peRange * 0.1),
    peMax + peRange * 0.1
  ];
  
  const marketCapMin = marketCapValues.length > 0 ? Math.min(...marketCapValues) : 0;
  const marketCapMax = marketCapValues.length > 0 ? Math.max(...marketCapValues) : 0;
  const marketCapRange = marketCapMax - marketCapMin;
  const marketCapDomain = [
    Math.max(0, marketCapMin - marketCapRange * 0.1),
    marketCapMax + marketCapRange * 0.1
  ];
  
  const useTrillion = marketCapMax >= 1000000000000;
  const marketCapDivisor = useTrillion ? 1000000000000 : 100000000;
  const marketCapUnit = useTrillion ? '万亿' : '亿';

  return (
    <StrategyLayout>
      <div className="py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              股债动态平衡策略
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              PE范围11-16，每6个月review一次，股票仓位与目标仓位超过10%时进行股债平衡
            </p>
            
            <YearSelector
              selectedYears={selectedYears}
              onYearsChange={setSelectedYears}
            />
          </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-6 mb-6">
            <h3 className="text-lg font-semibold text-red-800 mb-2">错误</h3>
            <p className="text-red-700">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
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

        {!loading && !error && strategyResult && (
          <>
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">策略结果</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">总收益率</h3>
                  <p className="text-2xl font-bold text-blue-600">
                    {strategyResult.totalReturn.toFixed(2)}%
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-green-900 mb-2">年化收益率</h3>
                  <p className="text-2xl font-bold text-green-600">
                    {strategyResult.annualizedReturn.toFixed(2)}%
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-purple-900 mb-2">最终仓位</h3>
                  <p className="text-2xl font-bold text-purple-600">
                    股票: {(strategyResult.finalStockRatio * 100).toFixed(1)}%
                  </p>
                  <p className="text-sm text-purple-700 mt-1">
                    债券: {((1 - strategyResult.finalStockRatio) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-red-900 mb-2">最大回撤</h3>
                  <p className="text-2xl font-bold text-red-600">
                    {strategyResult.maxDrawdown.toFixed(2)}%
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="mt-4 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
              >
                {showDetails ? '隐藏' : '展示'}详情
              </button>
              
              {showDetails && (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-2">年度详情</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">年份</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">年末总价值</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" colSpan={2}>股票</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" colSpan={2}>债券</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">收益率</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">交易次数</th>
                        </tr>
                        <tr>
                          <th></th>
                          <th></th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">当前价值</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">交易/指数变化</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">当前价值</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">交易/利息</th>
                          <th></th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {strategyResult.yearlyDetails.map((year, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{year.year}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{formatNumber(year.endValue)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{formatNumber(year.endStockValue)}</td>
                            <td className="px-4 py-3 text-sm">
                              <div className="space-y-1">
                                {((year.stockBuyAmount || 0) > 0 || (year.stockSellAmount || 0) > 0) && (
                                  <div>
                                    {(year.stockBuyAmount || 0) - (year.stockSellAmount || 0) > 0 ? (
                                      <span className="text-blue-600">+{formatNumber((year.stockBuyAmount || 0) - (year.stockSellAmount || 0))}</span>
                                    ) : (year.stockBuyAmount || 0) - (year.stockSellAmount || 0) < 0 ? (
                                      <span className="text-orange-600">{formatNumber((year.stockBuyAmount || 0) - (year.stockSellAmount || 0))}</span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </div>
                                )}
                                {(year.startIndexPrice || 0) > 0 && (year.endIndexPrice || 0) > 0 && (
                                  <div className="text-xs">
                                    <div className="text-gray-600">
                                      {year.startIndexPrice?.toFixed(2)} → {year.endIndexPrice?.toFixed(2)}
                                    </div>
                                    <span className={(year.endIndexPrice || 0) >= (year.startIndexPrice || 0) ? 'text-green-600' : 'text-red-600'}>
                                      ({(year.endIndexPrice || 0) >= (year.startIndexPrice || 0) ? '+' : ''}
                                      {(((year.endIndexPrice || 0) - (year.startIndexPrice || 0)) / (year.startIndexPrice || 1) * 100).toFixed(2)}%)
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{formatNumber(year.endBondValue)}</td>
                            <td className="px-4 py-3 text-sm">
                              <div className="space-y-1">
                                {((year.bondBuyAmount || 0) > 0 || (year.bondSellAmount || 0) > 0) && (
                                  <div>
                                    {(year.bondBuyAmount || 0) - (year.bondSellAmount || 0) > 0 ? (
                                      <span className="text-blue-600">+{formatNumber((year.bondBuyAmount || 0) - (year.bondSellAmount || 0))}</span>
                                    ) : (year.bondBuyAmount || 0) - (year.bondSellAmount || 0) < 0 ? (
                                      <span className="text-orange-600">{formatNumber((year.bondBuyAmount || 0) - (year.bondSellAmount || 0))}</span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </div>
                                )}
                                {(year.bondInterest || 0) > 0 && (
                                  <div className="text-green-600 text-xs">+{formatNumber(year.bondInterest || 0)}</div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={year.return >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {year.return >= 0 ? '+' : ''}{year.return.toFixed(2)}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{year.trades}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">PE与市值趋势</h2>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData.map(d => ({
                  ...d,
                  marketCapFormatted: d.marketCap ? d.marketCap / marketCapDivisor : null,
                }))} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tickFormatter={(value) => {
                      const item = chartData.find(d => d.date === value);
                      return item ? item.dateShort : value;
                    }}
                  />
                  <YAxis
                    yAxisId="left"
                    domain={peDomain}
                    label={{ value: 'PE TTM', angle: -90, position: 'insideLeft' }}
                    tickFormatter={(value) => value.toFixed(2)}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={marketCapDomain.map(v => v / marketCapDivisor)}
                    label={{ value: `市值 (${marketCapUnit})`, angle: 90, position: 'insideRight' }}
                    tickFormatter={(value) => value.toFixed(2)}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload[0]) return null;
                      
                      const item = chartData.find(d => d.date === label);
                      if (!item) return null;
                      
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                          <p className="font-semibold mb-2">{`日期: ${item.dateShort}`}</p>
                          <p className="text-sm mb-1">
                            <span className="font-medium">PE TTM:</span> {item.pe?.toFixed(2) || 'N/A'}
                          </p>
                          <p className="text-sm mb-1">
                            <span className="font-medium">市值:</span> {item.marketCap ? formatNumber(item.marketCap) : 'N/A'}
                          </p>
                          {item.hasTrade && (
                            <p className="text-sm mb-1">
                              <span className="font-medium">交易类型:</span>{' '}
                              <span className={item.tradeType === 'buy' ? 'text-red-600' : 'text-green-600'}>
                                {item.tradeType === 'buy' ? '买入' : '卖出'}
                              </span>
                            </p>
                          )}
                          <div className="border-t border-gray-200 mt-2 pt-2">
                            <p className="text-sm font-medium mb-1">策略状态:</p>
                            <p className="text-sm mb-1">
                              <span className="font-medium">仓位:</span> 股票 {(item.stockRatio * 100).toFixed(1)}% / 债券 {(item.bondRatio * 100).toFixed(1)}%
                            </p>
                            <p className="text-sm mb-1">
                              <span className="font-medium">股票价值:</span> {formatNumber(item.stockValue)}
                            </p>
                            <p className="text-sm mb-1">
                              <span className="font-medium">债券价值:</span> {formatNumber(item.bondValue)}
                            </p>
                            <p className="text-sm mb-1">
                              <span className="font-medium">总价值:</span> {formatNumber(item.totalValue)}
                            </p>
                            <p className="text-sm mb-1">
                              <span className="font-medium">相对初始价值变化:</span>{' '}
                              <span className={item.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                              </span>
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">年化收益率:</span>{' '}
                              <span className={item.annualizedReturn >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {item.annualizedReturn >= 0 ? '+' : ''}{item.annualizedReturn.toFixed(2)}%
                              </span>
                            </p>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="pe"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={(props: any) => {
                      const item = chartData.find(d => d.date === props.payload.date);
                      if (item && item.hasTrade) {
                        return (
                          <circle
                            cx={props.cx}
                            cy={props.cy}
                            r={6}
                            fill={item.tradeType === 'buy' ? '#ef4444' : '#10b981'}
                          />
                        );
                      }
                      return null;
                    }}
                    activeDot={{ r: 8 }}
                    name="PE TTM"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="marketCapFormatted"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                    name={`市值 (${marketCapUnit})`}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 flex gap-4 justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">买入点</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">卖出点</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
    </StrategyLayout>
  );
}
