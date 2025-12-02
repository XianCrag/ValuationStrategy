'use client';

import { useState, useCallback } from 'react';
import { StockData, ControlGroupResult } from '../types';
import { INITIAL_CAPITAL, DCA_MONTHS, CSI300_FUND_STOCK } from '../constants';
import { fetchLixingerData } from '@/lib/api';
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

  // 使用自定义Hook获取和计算数据
  const { data: stockData, result, loading, error, refetch } = useBacktestData<StockData[], ControlGroupResult>({
    fetchData: useCallback(async () => {
      // API 会根据 codeTypeMap 自动选择基金价格指标
      const stocks = await fetchLixingerData({
        stockCodes: [CSI300_FUND_STOCK.code],
        codeTypeMap: { [CSI300_FUND_STOCK.code]: 'fund' },
        years: selectedYears,
      });

      return stocks.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    }, [selectedYears]),
    calculateResult: useCallback((sortedStocks: StockData[]) => {
      if (sortedStocks.length === 0) {
        throw new Error('没有可用数据');
      }
      return calculateControlGroup2(sortedStocks, INITIAL_CAPITAL, DCA_MONTHS);
    }, []),
    dependencies: [selectedYears],
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
            title="对照组2：定投沪深300基金"
            description="4年时间每个月定投，直到100%"
            selectedYears={selectedYears}
            onYearsChange={setSelectedYears}
          />

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
                    <p>• <span className="text-blue-600 font-semibold">蓝线</span>：定投策略（48个月定投完成，左侧Y轴）</p>
                    <p>• <span className="text-green-600 font-semibold">绿线</span>：沪深300基金净值（右侧Y轴）</p>
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
