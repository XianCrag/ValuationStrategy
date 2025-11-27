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
import { INITIAL_CAPITAL, CSI300_INDEX_CODE, CSI300_FUND_CODE } from '../constants';
import { calculateStrategy } from './calculations';
import { formatNumber, formatDateShort } from '../utils';
import StrategyLayout from '../../components/Layout';
import YearSelector from '../../components/YearSelector';
import { YearlyDetailsTable } from '../../components/YearlyDetails';

export default function BacktestPage() {
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [indexData, setIndexData] = useState<StockData[]>([]); // 指数数据，用于图表对比
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
      // 同时获取指数和基金数据
      // 指数：用于图表展示和PE估值
      // 基金：用于策略实际交易计算
      const [indexResponse, fundResponse] = await Promise.all([
        // 获取指数数据（PE + 价格，用于图表展示）
        fetch('/api/lixinger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stockCodes: [CSI300_INDEX_CODE],
            codeTypeMap: { [CSI300_INDEX_CODE]: 'index' },
            years: selectedYears,
            metricsList: ['pe_ttm.mcw', 'cp', 'mc'],
          }),
        }),
        // 获取基金数据（价格，用于策略交易）
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

      const rawIndexData = indexResult.data as StockData[];
      const fundData = fundResult.data as StockData[];
      
      // 保存指数数据用于图表展示
      setIndexData(rawIndexData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      
      // 创建日期到PE的映射（从指数获取）
      const peMap = new Map<string, number>();
      rawIndexData.forEach(item => {
        if (item['pe_ttm.mcw']) {
          peMap.set(item.date, item['pe_ttm.mcw']);
        }
      });

      // 合并数据：基金价格（用于策略计算） + 指数PE（用于估值判断）
      const mergedData = fundData
        .map(fundItem => ({
          ...fundItem,
          'pe_ttm.mcw': peMap.get(fundItem.date),
        }))
        .filter(item => item['pe_ttm.mcw'] !== undefined && item.cp !== undefined)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setStockData(mergedData);

      // 计算策略结果（使用基金价格进行交易）
      const result = calculateStrategy(mergedData, INITIAL_CAPITAL);
      setStrategyResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // 创建图表数据：合并策略数据、指数数据
  const chartData = stockData
    .map(item => {
      const trade = strategyResult?.trades.find(t => t.date === item.date);
      const dailyState = strategyResult?.dailyStates.find(s => s.date === item.date);
      const indexItem = indexData.find(idx => idx.date === item.date); // 找到对应日期的指数数据
      return {
        date: item.date,
        dateShort: formatDateShort(item.date),
        pe: item['pe_ttm.mcw'],
        marketCap: indexItem?.mc, // 指数市值
        indexPrice: indexItem?.cp, // 指数价格
        fundPrice: item.cp, // 基金价格（策略实际使用）
        hasTrade: !!trade,
        tradeType: trade?.type,
        stockRatio: trade?.stockRatio ?? dailyState?.stockRatio ?? 0,
        bondRatio: trade?.bondRatio ?? dailyState?.bondRatio ?? 0,
        stockValue: trade?.stockValue ?? dailyState?.stockValue ?? 0,
        bondValue: trade?.bondValue ?? dailyState?.bondValue ?? 0,
        totalValue: trade?.totalValue ?? dailyState?.totalValue ?? 0,
        changePercent: trade?.changePercent ?? dailyState?.changePercent ?? 0,
        annualizedReturn: trade?.annualizedReturn ?? dailyState?.annualizedReturn ?? 0,
        // 转换为万元单位，方便显示
        totalValueInWan: ((trade?.totalValue ?? dailyState?.totalValue ?? 0) / 10000),
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const peValues = chartData
    .map(d => d.pe)
    .filter((val): val is number => val !== null && val !== undefined);
  const marketCapValues = chartData
    .map(d => d.marketCap)
    .filter((val): val is number => val !== null && val !== undefined);
  const totalValueValues = chartData
    .map(d => d.totalValueInWan)
    .filter((val): val is number => val !== null && val !== undefined);
  const indexPriceValues = chartData
    .map(d => d.indexPrice)
    .filter((val): val is number => val !== null && val !== undefined);
  
  const peMin = peValues.length > 0 ? Math.min(...peValues) : 0;
  const peMax = peValues.length > 0 ? Math.max(...peValues) : 0;
  const peRange = peMax - peMin;
  const peDomain = [
    Math.max(0, peMin - peRange * 0.1),
    peMax + peRange * 0.1
  ];
  
  // 左Y轴：策略价值（万元）
  const valueMin = totalValueValues.length > 0 ? Math.min(...totalValueValues) : 0;
  const valueMax = totalValueValues.length > 0 ? Math.max(...totalValueValues) : 0;
  const valueRange = valueMax - valueMin;
  const valueDomain = [
    Math.max(0, valueMin - valueRange * 0.1),
    valueMax + valueRange * 0.1
  ];
  
  // 右Y轴：指数价格（点位）
  const indexPriceMin = indexPriceValues.length > 0 ? Math.min(...indexPriceValues) : 0;
  const indexPriceMax = indexPriceValues.length > 0 ? Math.max(...indexPriceValues) : 0;
  const indexPriceRange = indexPriceMax - indexPriceMin;
  const indexPriceDomain = [
    Math.max(0, indexPriceMin - indexPriceRange * 0.1),
    indexPriceMax + indexPriceRange * 0.1
  ];

  return (
    <StrategyLayout>
      <div className="py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              股债动态平衡策略
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              PE范围11-16，每6个月review一次
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
                  <YearlyDetailsTable
                    yearlyDetails={strategyResult.yearlyDetails}
                    strategyType="strategy"
                  />
                </div>
              )}
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">策略表现与PE趋势对比</h2>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
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
                  {/* 左Y轴：策略价值 */}
                  <YAxis
                    yAxisId="left"
                    domain={valueDomain}
                    label={{ value: '策略价值 (万元)', angle: -90, position: 'insideLeft' }}
                    tickFormatter={(value) => value.toFixed(0)}
                  />
                  {/* 右Y轴1：指数点位（隐藏刻度） */}
                  <YAxis
                    yAxisId="index"
                    orientation="right"
                    domain={indexPriceDomain}
                    hide={true}
                  />
                  {/* 右Y轴2：PE */}
                  <YAxis
                    yAxisId="pe"
                    orientation="right"
                    domain={peDomain}
                    label={{ value: 'PE TTM', angle: 90, position: 'insideRight' }}
                    tickFormatter={(value) => value.toFixed(1)}
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
                            <span className="font-medium">策略总价值:</span> {formatNumber(item.totalValue)}
                          </p>
                          <p className="text-sm mb-1">
                            <span className="font-medium">沪深300指数:</span> {item.indexPrice?.toFixed(2) || 'N/A'}
                          </p>
                          <p className="text-sm mb-1">
                            <span className="font-medium">PE TTM:</span> {item.pe?.toFixed(2) || 'N/A'}
                          </p>
                          {item.hasTrade && (
                            <p className="text-sm mb-1">
                              <span className="font-medium">交易类型:</span>{' '}
                              <span className={item.tradeType === 'buy' ? 'text-red-600' : 'text-green-600'}>
                                {item.tradeType === 'buy' ? '买入股票' : '卖出股票'}
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
                  {/* 策略价值曲线 - 主要曲线，带买卖标记 */}
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="totalValueInWan"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={(props: any) => {
                      const item = chartData.find(d => d.date === props.payload.date);
                      if (item && item.hasTrade) {
                        return (
                          <circle
                            cx={props.cx}
                            cy={props.cy}
                            r={8}
                            fill={item.tradeType === 'buy' ? '#ef4444' : '#10b981'}
                            stroke="#fff"
                            strokeWidth={2}
                          />
                        );
                      }
                      return null;
                    }}
                    activeDot={{ r: 8 }}
                    name="策略价值 (万元)"
                  />
                  {/* 指数点位曲线 - 对比基准 */}
                  <Line
                    yAxisId="index"
                    type="monotone"
                    dataKey="indexPrice"
                    stroke="#f97316"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={{ r: 6 }}
                    name="沪深300指数"
                  />
                  {/* PE曲线 */}
                  <Line
                    yAxisId="pe"
                    type="monotone"
                    dataKey="pe"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                    name="PE TTM"
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 flex gap-4 justify-center flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">策略价值</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 bg-orange-500" style={{ width: '20px', height: '4px' }}></div>
                  <span className="text-sm text-gray-600">沪深300指数</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">PE指标</span>
                </div>
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
