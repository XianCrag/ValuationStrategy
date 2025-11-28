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
import { BondData, ApiResponse, ControlGroupResult } from '../types';
import { INITIAL_CAPITAL, NATIONAL_DEBT_STOCK } from '../constants';
import { calculateControlGroup1 } from './calculations';
import { formatNumber, formatDate, formatDateShort } from '../utils';
import { YearlyDetailsTable } from '../../components/YearlyDetails';
import StrategyLayout from '../../components/Layout';
import YearSelector from '../../components/YearSelector';
import { optimizeChartData } from '../chart-utils';

export default function CashBondPage() {
  const [bondData, setBondData] = useState<BondData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ControlGroupResult | null>(null);
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
      // 获取国债数据（服务器端自动处理分批请求）
      const bondResponse = await fetch('/api/lixinger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nationalDebtCodes: [NATIONAL_DEBT_STOCK.code],
          years: selectedYears,
        }),
      });

      const bondResult: ApiResponse = await bondResponse.json();

      if (!bondResult.success) {
        throw new Error(bondResult.error || 'Failed to fetch data');
      }

      const bonds = (bondResult.data as BondData[]).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      setBondData(bonds);

      if (bonds.length > 0) {
        const startDate = new Date(bonds[0].date);
        const endDate = new Date(bonds[bonds.length - 1].date);
        const calcResult = calculateControlGroup1(startDate, endDate, INITIAL_CAPITAL);
        setResult(calcResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <StrategyLayout>
      <div className="py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              对照组1：现金国债
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              全部资金持有现金国债，每年根据当年国债利率计算利息
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
              
              {bondData.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 mt-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">10年期国债收益率趋势</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={optimizeChartData(
                        bondData
                          .filter(item => item.tcm_y10 !== undefined && item.tcm_y10 !== null)
                          .map((item) => ({
                            date: item.date,
                            dateShort: formatDateShort(item.date),
                            rate: item.tcm_y10,
                          })),
                        { maxPoints: 300, keepFirstAndLast: true }
                      )}
                      margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval="preserveStartEnd"
                        tickFormatter={(value) => {
                          const item = bondData.find(d => d.date === value);
                          return item ? formatDateShort(item.date) : value;
                        }}
                      />
                      <YAxis
                        label={{ value: '收益率 (%)', angle: -90, position: 'insideLeft' }}
                        tickFormatter={(value) => value.toFixed(2)}
                      />
                      <Tooltip
                        formatter={(value: any) => {
                          const numValue = typeof value === 'number' ? value : null;
                          return numValue !== null && !isNaN(numValue)
                            ? [`${numValue.toFixed(2)}%`, '收益率']
                            : ['N/A', '收益率'];
                        }}
                        labelFormatter={(label) => `日期: ${formatDate(label)}`}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="rate"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6 }}
                        name="10年期国债收益率 (%)"
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              
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
                    yearlyDetails={result.yearlyDetails}
                    strategyType="cash-bond"
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

