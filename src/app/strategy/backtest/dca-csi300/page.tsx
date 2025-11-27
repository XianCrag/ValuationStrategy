'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
import { calculateControlGroup2 } from '../common/calculations';
import { formatNumber, formatDateShort } from '../../utils';
import { YearlyDetailsTable } from '../../components/YearlyDetailsTable';

export default function DcaCsi300Page() {
  const pathname = usePathname();
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ControlGroupResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [years, setYears] = useState(10); // 默认10年

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [years]); // 当年限改变时重新获取数据

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
          years: years,
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
  const chartData = result && stockData.length > 0 ? result.dailyValues.map((daily) => {
    const fundPrice = stockData.find(s => s.date === daily.date)?.cp || 0;
    const initialFundPrice = stockData[0]?.cp || 1;
    
    return {
      date: daily.date,
      dateShort: formatDateShort(daily.date),
      strategyValue: daily.value,
      fundValue: (fundPrice / initialFundPrice) * INITIAL_CAPITAL, // 基金净值按初始投入归一化
    };
  }) : [];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-center mb-8 border-b border-gray-200">
          <Link
            href="/strategy"
            className={`px-6 py-3 font-medium transition-colors ${
              pathname === '/strategy'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            数据展示
          </Link>
          <Link
            href="/strategy/backtest"
            className={`px-6 py-3 font-medium transition-colors ${
              pathname === '/strategy/backtest'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            策略回测
          </Link>
          <Link
            href="/strategy/backtest/cash-bond"
            className={`px-6 py-3 font-medium transition-colors ${
              pathname === '/strategy/backtest/cash-bond'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            现金国债
          </Link>
          <Link
            href="/strategy/backtest/dca-csi300"
            className={`px-6 py-3 font-medium transition-colors ${
              pathname === '/strategy/backtest/dca-csi300'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            定投沪深300
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            对照组2：定投沪深300基金
          </h1>
          <p className="text-lg text-gray-600">
            4年时间每个月定投，直到100%
          </p>
        </div>

        {/* 年限选择器 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-center gap-4">
            <label className="text-sm font-medium text-gray-700">
              投资时长：
            </label>
            <select
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              <option value={5}>5年</option>
              <option value={10}>10年</option>
              <option value={15}>15年</option>
              <option value={20}>20年</option>
            </select>
          </div>
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
                  margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={Math.floor(chartData.length / 10)}
                    tickFormatter={(value) => formatDateShort(value)}
                  />
                  <YAxis
                    label={{ value: '价值（元）', angle: -90, position: 'insideLeft' }}
                    tickFormatter={(value) => `${(value / 10000).toFixed(0)}万`}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      const numValue = typeof value === 'number' ? value : 0;
                      return [formatNumber(numValue), name === 'strategyValue' ? '定投策略' : '一次性买入'];
                    }}
                    labelFormatter={(label) => `日期: ${formatDateShort(label)}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="strategyValue"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                    name="定投策略总价值"
                  />
                  <Line
                    type="monotone"
                    dataKey="fundValue"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                    name="一次性买入基金"
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 text-sm text-gray-600">
                <p>• <span className="text-blue-600 font-semibold">蓝线</span>：定投策略（48个月定投完成）</p>
                <p>• <span className="text-green-600 font-semibold">绿线</span>：一次性买入基金（用于对比）</p>
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
  );
}

