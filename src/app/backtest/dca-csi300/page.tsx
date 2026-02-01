'use client';

import { useState, useCallback } from 'react';
import { StockData, ControlGroupResult } from '../types';
import { INITIAL_CAPITAL, DCA_MONTHS, CSI300_FUND_STOCK, ALL_FUNDS, StockConfig } from '../constants';
import { fetchLixingerData, StockType } from '@/lib/api';
import { calculateControlGroup2 } from './calculations';
import { formatNumber, formatDateShort } from '../utils';
import { YearlyDetailsTable } from '../../components/YearlyDetails';
import StrategyLayout from '../../components/Layout';
import ErrorDisplay from '../../components/Error';
import LoadingSpinner from '../../components/LoadingSpinner';
import PageHeader from '../../components/PageHeader';
import CollapsibleSection from '../../components/CollapsibleSection';
import { ChartTooltip } from '../../components/ChartTooltips';
import StrategyResultCards from '../components/StrategyResultCards';
import { optimizeChartData } from '../chart-utils';
import { ChartContainer } from '../../components/Chart';
import { useBacktestData } from '../hooks/useBacktestData';

export default function DcaCsi300Page() {
  const [selectedYears, setSelectedYears] = useState(10);
  const [selectedFund, setSelectedFund] = useState<StockConfig>(CSI300_FUND_STOCK);

  // 使用自定义Hook获取和计算数据
  const { data: stockData, result, loading, error, refetch } = useBacktestData<StockData[], ControlGroupResult>({
    fetchData: useCallback(async () => {
      // API 会根据 codeTypeMap 自动选择基金价格指标
      const stocks = await fetchLixingerData({
        stockCodes: [selectedFund.code],
        codeTypeMap: { [selectedFund.code]: StockType.FUND },
        years: selectedYears,
      });

      return stocks.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    }, [selectedYears, selectedFund]),
    calculateResult: useCallback((sortedStocks: StockData[]) => {
      if (sortedStocks.length === 0) {
        throw new Error('没有可用数据');
      }
      return calculateControlGroup2(sortedStocks, INITIAL_CAPITAL, DCA_MONTHS);
    }, []),
    dependencies: [selectedYears, selectedFund],
  });

  // 准备图表数据
  const rawChartData = result && stockData ? result.dailyValues.map((daily) => {
    const fundPrice = stockData.find(s => s.date === daily.date)?.cp || 0;
    
    return {
      date: daily.date,
      dateShort: formatDateShort(daily.date),
      strategyValue: daily.value,
      fundValue: fundPrice,
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
          <PageHeader
            title="定投策略"
            description="固定时间间隔定投，平滑成本，长期持有"
            selectedYears={selectedYears}
            onYearsChange={setSelectedYears}
          />

          {/* 基金选择 */}
          <div className="mb-6 p-6 bg-white rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">策略参数配置</h3>
            
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择投资标的（基金）
              </label>
              <select
                value={selectedFund.code}
                onChange={(e) => {
                  const fund = ALL_FUNDS.find(f => f.code === e.target.value);
                  if (fund) setSelectedFund(fund);
                }}
                className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {ALL_FUNDS.map((fund) => (
                  <option key={fund.code} value={fund.code}>
                    {fund.name} ({fund.code})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-600 mt-2">
                💡 当前选择：<span className="font-semibold">{selectedFund.name}</span>
              </p>
            </div>

            {/* 策略说明 */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-semibold mb-2 text-gray-800">策略说明</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• <strong>定投方式：</strong> 将初始资金{(INITIAL_CAPITAL / 10000).toFixed(0)}万元分{DCA_MONTHS}个月定投完成（每月约{(INITIAL_CAPITAL / DCA_MONTHS / 10000).toFixed(2)}万元）</li>
                <li>• <strong>定投周期：</strong> {DCA_MONTHS}个月（{(DCA_MONTHS / 12).toFixed(1)}年）</li>
                <li>• <strong>持有策略：</strong> 定投完成后长期持有，不做任何操作</li>
                <li>• <strong>数据来源：</strong> 使用真实基金净值数据进行回测</li>
              </ul>
            </div>
          </div>

          {error && <ErrorDisplay error={error} onRetry={refetch} />}

          {loading && <LoadingSpinner />}

          {!loading && !error && result && (
            <>
              <StrategyResultCards
                totalReturn={result.totalReturn}
                annualizedReturn={result.annualizedReturn}
                finalValue={result.finalValue}
                maxDrawdown={result.maxDrawdown}
              />

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
                    name: '基金净值',
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
                tooltipContent={(props: any) => (
                  <ChartTooltip
                    {...props}
                    dateKey="dateShort"
                    formatters={{
                      strategyValue: (value) => formatNumber(value),
                      fundValue: (value) => value.toFixed(4),
                    }}
                  />
                )}
                legendContent={
                  <div className="mt-4 text-sm text-gray-600">
                    <p>• <span className="text-blue-600 font-semibold">蓝线</span>：定投策略总价值（{DCA_MONTHS}个月定投完成，左侧Y轴）</p>
                    <p>• <span className="text-green-600 font-semibold">绿线</span>：{selectedFund.name}净值（右侧Y轴）</p>
                  </div>
                }
                showLegend={false}
              />

              <CollapsibleSection
                buttonText={{ show: '展示年度详情', hide: '隐藏年度详情' }}
              >
                <h3 className="text-lg font-semibold mb-2">年度详情</h3>
                <YearlyDetailsTable
                  yearlyDetails={result.yearlyDetails}
                  strategyType="dca"
                  showStockPositions={false}
                />
              </CollapsibleSection>
            </>
          )}
        </div>
      </div>
    </StrategyLayout>
  );
}
