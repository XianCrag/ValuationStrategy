'use client';

import { useState, useEffect } from 'react';
import { StockData, ControlGroupResult } from '../types';
import { INITIAL_CAPITAL, DCA_MONTHS, CSI300_FUND_STOCK } from '../constants';
import { PRICE_ONLY_METRICS } from '@/constants/metrics';
import { fetchLixingerData } from '@/lib/api';
import { calculateControlGroup2 } from './calculations';
import { formatNumber, formatDateShort } from '../utils';
import { YearlyDetailsTable } from '../../components/YearlyDetails';
import StrategyLayout from '../../components/Layout';
import YearSelector from '../../components/YearSelector';
import { optimizeChartData } from '../chart-utils';
import { ChartContainer } from '../../components/Chart';

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
      const stocks = await fetchLixingerData({
        stockCodes: [CSI300_FUND_STOCK.code],
        codeTypeMap: { [CSI300_FUND_STOCK.code]: 'fund' },
        years: selectedYears,
        metricsList: PRICE_ONLY_METRICS,
      });

      const sortedStocks = stocks.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      setStockData(sortedStocks);

      if (sortedStocks.length > 0) {
        const calcResult = calculateControlGroup2(sortedStocks, INITIAL_CAPITAL, DCA_MONTHS);
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
            <ChartContainer
              data={chartData}
              lines={[
                {
                  dataKey: 'strategyValue',
                  name: '定投策略总价值',
                  stroke: '#3b82f6',
                  strokeWidth: 2,
                  yAxisId: 'left',
                },
                {
                  dataKey: 'fundValue',
                  name: '沪深300基金净值',
                  stroke: '#10b981',
                  strokeWidth: 2,
                  yAxisId: 'right',
                },
              ]}
              yAxes={[
                {
                  yAxisId: 'left',
                  orientation: 'left',
                  label: '定投策略价值（元）',
                  tickFormatter: (value) => `${(value / 10000).toFixed(0)}万`,
                },
                {
                  yAxisId: 'right',
                  orientation: 'right',
                  label: '基金净值',
                  tickFormatter: (value) => value.toFixed(2),
                },
              ]}
              title="价值变化对比"
              xTickFormatter={(value) => formatDateShort(value)}
              tooltipContent={(props: any) => {
                const { active, payload, label } = props;
                if (!active || !payload || !payload[0]) return null;
                
                return (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                    <p className="font-semibold mb-2">日期: {formatDateShort(label)}</p>
                    {payload.map((item: any, index: number) => (
                      <p key={index} className="text-sm mb-1">
                        <span className="font-medium">{item.name}:</span>{' '}
                        {item.dataKey === 'strategyValue' 
                          ? formatNumber(item.value) 
                          : item.value.toFixed(4)}
                      </p>
                    ))}
                  </div>
                );
              }}
              legendContent={
                <div className="mt-4 text-sm text-gray-600">
                  <p>• <span className="text-blue-600 font-semibold">蓝线</span>：定投策略（48个月定投完成，左侧Y轴）</p>
                  <p>• <span className="text-green-600 font-semibold">绿线</span>：沪深300基金净值（右侧Y轴）</p>
                </div>
              }
              showLegend={false}
            />

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

