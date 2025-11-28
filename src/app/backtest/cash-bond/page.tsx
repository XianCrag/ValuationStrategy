'use client';

import { useState, useEffect } from 'react';
import { BondData, ControlGroupResult } from '../types';
import { INITIAL_CAPITAL, NATIONAL_DEBT_STOCK } from '../constants';
import { fetchLixingerData } from '@/lib/api';
import { calculateControlGroup1 } from './calculations';
import { formatNumber, formatDate, formatDateShort } from '../utils';
import { YearlyDetailsTable } from '../../components/YearlyDetails';
import StrategyLayout from '../../components/Layout';
import YearSelector from '../../components/YearSelector';
import { optimizeChartData } from '../chart-utils';
import { ChartContainer } from '../../components/Chart';

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
      const bonds = await fetchLixingerData<BondData>({
        nationalDebtCodes: [NATIONAL_DEBT_STOCK.code],
        years: selectedYears,
      });

      const sortedBonds = bonds.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      setBondData(sortedBonds);

      if (sortedBonds.length > 0) {
        const startDate = new Date(sortedBonds[0].date);
        const endDate = new Date(sortedBonds[sortedBonds.length - 1].date);
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
                <ChartContainer
                  data={optimizeChartData(
                    bondData
                      .filter(item => item.tcm_y10 !== undefined && item.tcm_y10 !== null)
                      .map((item) => ({
                        date: item.date,
                        dateShort: formatDateShort(item.date),
                        fullDate: formatDate(item.date),
                        rate: item.tcm_y10,
                      })),
                    { maxPoints: 300, keepFirstAndLast: true }
                  )}
                  lines={[
                    {
                      dataKey: 'rate',
                      name: '10年期国债收益率 (%)',
                      stroke: '#10b981',
                      strokeWidth: 2,
                    },
                  ]}
                  yAxes={[
                    {
                      yAxisId: 'left',
                      label: '收益率 (%)',
                      tickFormatter: (value) => value.toFixed(2),
                    },
                  ]}
                  title="10年期国债收益率趋势"
                  height={300}
                  xTickFormatter={(value) => {
                    const item = bondData.find(d => d.date === value);
                    return item ? formatDateShort(item.date) : value;
                  }}
                  tooltipContent={(props: any) => {
                    const { active, payload, label } = props;
                    if (!active || !payload || !payload[0]) return null;
                    
                    return (
                      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                        <p className="font-semibold mb-1">日期: {formatDate(label)}</p>
                        <p className="text-sm">
                          收益率: {payload[0].value.toFixed(2)}%
                        </p>
                      </div>
                    );
                  }}
                />
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

