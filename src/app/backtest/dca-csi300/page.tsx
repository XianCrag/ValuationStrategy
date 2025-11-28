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
import { StockData, ApiResponse, ControlGroupResult } from '../types';
import { INITIAL_CAPITAL, DCA_MONTHS, CSI300_FUND_CODE } from '../constants';
import { calculateControlGroup2 } from './calculations';
import { formatNumber, formatDateShort } from '../utils';
import { YearlyDetailsTable } from '../../components/YearlyDetails';
import StrategyLayout from '../../components/Layout';
import YearSelector from '../../components/YearSelector';
import { optimizeChartData } from '../chart-utils';

export default function DcaCsi300Page() {
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ControlGroupResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedYears, setSelectedYears] = useState(10); // 默认10年

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYears]); // 当年限改变时重新获取数据

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // 获取沪深300基金数据（服务器端自动处理分批请求）
      const stockResponse = await fetch('/api/lixinger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stockCodes: [CSI300_FUND_CODE],
          codeTypeMap: { [CSI300_FUND_CODE]: 'fund' },
          years: selectedYears,
          metricsList: ['cp'],
        }),
      });

      const stockResult: ApiResponse = await stockResponse.json();

      if (!stockResult.success) {
        throw new Error(stockResult.error || 'Failed to fetch data');
      }

      const stocks = (stockResult.data as StockData[]).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      setStockData(stocks);

      if (stocks.length > 0) {
        const calcResult = calculateControlGroup2(stocks, INITIAL_CAPITAL, DCA_MONTHS);
        setResult(calcResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // 准备图表数据
  const rawChartData = result && stockData.length > 0 ? result.dailyValues.map((daily) => {
    const fundPrice = stockData.find(s => s.date === daily.date)?.cp || 0;
    
    return {
      date: daily.date,
      dateShort: formatDateShort(daily.date),
      strategyValue: daily.value,
      fundValue: fundPrice, // 基金净值
    };
  }) : [];

  // 优化图表数据：减少点位数量
  const chartData = optimizeChartData(rawChartData, {
    maxPoints: 300,
    keepFirstAndLast: true,
  });

  return (
    <StrategyLayout>
      <div className="py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              对照组2：定投沪深300基金
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              4年时间每个月定投，直到100%
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

        {!loading && !error && result && (
          <>
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">策略结果</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">总收益率</h3>
                  <p className="text-2xl font-bold text-blue-600">
                    {result.totalReturn.toFixed(2)}%
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-green-900 mb-2">年化收益率</h3>
                  <p className="text-2xl font-bold text-green-600">
                    {result.annualizedReturn.toFixed(2)}%
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-purple-900 mb-2">最终价值</h3>
                  <p className="text-xl font-bold text-purple-600">
                    {formatNumber(result.finalValue)}
                  </p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-red-900 mb-2">最大回撤</h3>
                  <p className="text-2xl font-bold text-red-600">
                    {result.maxDrawdown.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>

            {/* 价值变化折线图 */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">价值变化对比</h2>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 60, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval="preserveStartEnd"
                    tickFormatter={(value) => formatDateShort(value)}
                  />
                  <YAxis
                    yAxisId="left"
                    label={{ value: '定投策略价值（元）', angle: -90, position: 'insideLeft' }}
                    tickFormatter={(value) => `${(value / 10000).toFixed(0)}万`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    label={{ value: '基金净值', angle: 90, position: 'insideRight' }}
                    tickFormatter={(value) => value.toFixed(2)}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      const numValue = typeof value === 'number' ? value : 0;
                      return [
                        name === 'strategyValue' ? formatNumber(numValue) : numValue.toFixed(4), 
                        name === 'strategyValue' ? '定投策略' : '沪深300净值'
                      ];
                    }}
                    labelFormatter={(label) => `日期: ${formatDateShort(label)}`}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="strategyValue"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                    name="定投策略总价值"
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="fundValue"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                    name="沪深300基金净值"
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 text-sm text-gray-600">
                <p>• <span className="text-blue-600 font-semibold">蓝线</span>：定投策略（48个月定投完成，左侧Y轴）</p>
                <p>• <span className="text-green-600 font-semibold">绿线</span>：沪深300基金净值（右侧Y轴）</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="mb-4 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
              >
                {showDetails ? '隐藏' : '展示'}年度详情
              </button>
              
              {showDetails && (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-2">年度详情</h3>
                  <YearlyDetailsTable
                    yearlyDetails={result.yearlyDetails}
                    strategyType="dca"
                    showStockPositions={true}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
    </StrategyLayout>
  );
}

