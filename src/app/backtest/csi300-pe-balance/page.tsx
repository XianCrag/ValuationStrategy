'use client';

import { useState, useCallback } from 'react';
import { StockData, StrategyResult } from '../types';
import { INITIAL_CAPITAL, CSI300_INDEX_STOCK, CSI300_FUND_STOCK } from '../constants';
import { calculateStrategy } from './calculations';
import { formatDateShort } from '../utils';
import { fetchLixingerData } from '@/lib/api';
import StrategyLayout from '../../components/Layout';
import ErrorDisplay from '../../components/Error';
import LoadingSpinner from '../../components/LoadingSpinner';
import PageHeader from '../../components/PageHeader';
import CollapsibleSection from '../../components/CollapsibleSection';
import StrategyResultCards from '../components/StrategyResultCards';
import { YearlyDetailsTable } from '../../components/YearlyDetails';
import { optimizeChartData } from '../chart-utils';
import { StockBondChartTooltip, ChartLegend } from './ChartComponents';
import { ChartContainer } from '../../components/Chart';
import { 
  METRIC_PE_TTM_MCW, 
  METRIC_CP, 
  METRIC_MC,
  INDEX_FULL_METRICS,
  PRICE_ONLY_METRICS,
} from '@/constants/metrics';
import { useBacktestData } from '../hooks/useBacktestData';

interface MergedData {
  stockData: StockData[];
  indexData: StockData[];
}

export default function BacktestPage() {
  const [selectedYears, setSelectedYears] = useState<number>(10);

  // 使用自定义Hook获取和计算数据
  const { data, result: strategyResult, loading, error, refetch } = useBacktestData<MergedData, StrategyResult>({
    fetchData: useCallback(async () => {
      // 同时获取指数和基金数据
      const [rawIndexData, fundData] = await Promise.all([
        fetchLixingerData({
          stockCodes: [CSI300_INDEX_STOCK.code],
          codeTypeMap: { [CSI300_INDEX_STOCK.code]: 'index' },
          years: selectedYears,
          metricsList: INDEX_FULL_METRICS,
        }),
        fetchLixingerData({
          stockCodes: [CSI300_FUND_STOCK.code],
          codeTypeMap: { [CSI300_FUND_STOCK.code]: 'fund' },
          years: selectedYears,
          metricsList: PRICE_ONLY_METRICS,
        }),
      ]);

      // 保存指数数据用于图表展示
      const indexData = rawIndexData.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      // 创建日期到PE的映射（从指数获取）
      const peMap = new Map<string, number>();
      rawIndexData.forEach(item => {
        if (item[METRIC_PE_TTM_MCW]) {
          peMap.set(item.date, item[METRIC_PE_TTM_MCW]);
        }
      });

      // 合并数据：基金价格（用于策略计算） + 指数PE（用于估值判断）
      const stockData = fundData
        .map(fundItem => ({
          ...fundItem,
          [METRIC_PE_TTM_MCW]: peMap.get(fundItem.date),
        }))
        .filter(item => item[METRIC_PE_TTM_MCW] !== undefined && item[METRIC_CP] !== undefined)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return { stockData, indexData };
    }, [selectedYears]),
    calculateResult: useCallback((data: MergedData) => {
      if (data.stockData.length === 0) {
        throw new Error('没有可用数据');
      }
      return calculateStrategy(data.stockData, INITIAL_CAPITAL);
    }, []),
    dependencies: [selectedYears],
  });

  const stockData = data?.stockData || [];
  const indexData = data?.indexData || [];

  // 创建图表数据：合并策略数据、指数数据
  const rawChartData = stockData
    .map(item => {
      const trade = strategyResult?.trades.find(t => t.date === item.date);
      const dailyState = strategyResult?.dailyStates.find(s => s.date === item.date);
      const indexItem = indexData.find(idx => idx.date === item.date);
      return {
        date: item.date,
        dateShort: formatDateShort(item.date),
        pe: item[METRIC_PE_TTM_MCW],
        marketCap: indexItem?.[METRIC_MC],
        indexPrice: indexItem?.[METRIC_CP],
        fundPrice: item[METRIC_CP],
        hasTrade: !!trade,
        tradeType: trade?.type,
        stockRatio: trade?.stockRatio ?? dailyState?.stockRatio ?? 0,
        bondRatio: trade?.bondRatio ?? dailyState?.bondRatio ?? 0,
        stockValue: trade?.stockValue ?? dailyState?.stockValue ?? 0,
        bondValue: trade?.bondValue ?? dailyState?.bondValue ?? 0,
        totalValue: trade?.totalValue ?? dailyState?.totalValue ?? 0,
        changePercent: trade?.changePercent ?? dailyState?.changePercent ?? 0,
        annualizedReturn: trade?.annualizedReturn ?? dailyState?.annualizedReturn ?? 0,
        totalValueInWan: ((trade?.totalValue ?? dailyState?.totalValue ?? 0) / 10000),
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 优化图表数据：减少点位数量，保留交易点
  const chartData = optimizeChartData(rawChartData, {
    maxPoints: 300,
    isKeyPoint: (point) => point.hasTrade,
    keepFirstAndLast: true,
  });
  
  // 计算Y轴范围的工具函数
  const calculateDomain = (values: number[], padding = 0.1): [number, number] => {
    if (values.length === 0) return [0, 0];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    return [Math.max(0, min - range * padding), max + range * padding];
  };
  
  const peValues = chartData.map(d => d.pe).filter((val): val is number => val !== null && val !== undefined);
  const totalValueValues = chartData.map(d => d.totalValueInWan).filter((val): val is number => val !== null && val !== undefined);
  const indexPriceValues = chartData.map(d => d.indexPrice).filter((val): val is number => val !== null && val !== undefined);
  
  const peDomain = calculateDomain(peValues);
  const valueDomain = calculateDomain(totalValueValues);
  const indexPriceDomain = calculateDomain(indexPriceValues);

  return (
    <StrategyLayout>
      <div className="py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            title="沪深300PE平衡策略"
            description="基于沪深300指数PE的股债动态平衡策略，PE范围11-16，每6个月review一次"
            selectedYears={selectedYears}
            onYearsChange={setSelectedYears}
          />

          {error && <ErrorDisplay error={error} onRetry={refetch} />}

          {loading && <LoadingSpinner />}

          {!loading && !error && strategyResult && (
            <>
              <StrategyResultCards
                totalReturn={strategyResult.totalReturn}
                annualizedReturn={strategyResult.annualizedReturn}
                finalValue={strategyResult.finalValue}
                maxDrawdown={strategyResult.maxDrawdown}
                finalStockRatio={strategyResult.finalStockRatio}
              />
              
              <ChartContainer
                data={chartData}
                lines={[
                  {
                    dataKey: 'totalValueInWan',
                    name: '策略价值 (万元)',
                    stroke: '#8b5cf6',
                    strokeWidth: 3,
                    yAxisId: 'left',
                    dot: (props: any) => {
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
                    },
                  },
                  {
                    dataKey: 'indexPrice',
                    name: '沪深300指数',
                    stroke: '#f97316',
                    strokeWidth: 2,
                    strokeDasharray: '5 5',
                    yAxisId: 'index',
                  },
                  {
                    dataKey: 'pe',
                    name: 'PE TTM',
                    stroke: '#3b82f6',
                    strokeWidth: 2,
                    yAxisId: 'pe',
                  },
                ]}
                yAxes={[
                  {
                    yAxisId: 'left',
                    orientation: 'left',
                    label: '策略价值 (万元)',
                    domain: [valueDomain[0], valueDomain[1]],
                    tickFormatter: (value) => value.toFixed(0),
                  },
                  {
                    yAxisId: 'index',
                    orientation: 'right',
                    domain: [indexPriceDomain[0], indexPriceDomain[1]],
                    hide: true,
                  },
                  {
                    yAxisId: 'pe',
                    orientation: 'right',
                    label: 'PE TTM',
                    domain: [peDomain[0], peDomain[1]],
                    tickFormatter: (value) => value.toFixed(1),
                  },
                ]}
                title="策略表现与PE趋势对比"
                xTickFormatter={(value) => {
                  const item = chartData.find(d => d.date === value);
                  return item ? item.dateShort : value;
                }}
                tooltipContent={(props) => (
                  <StockBondChartTooltip {...props} chartData={chartData} />
                )}
                legendContent={<ChartLegend />}
                showLegend={false}
              />

              <CollapsibleSection
                buttonText={{ show: '展示详情', hide: '隐藏详情' }}
              >
                <h3 className="text-lg font-semibold mb-2">年度详情</h3>
                <YearlyDetailsTable
                  yearlyDetails={strategyResult.yearlyDetails}
                  strategyType="strategy"
                />
              </CollapsibleSection>
            </>
          )}
        </div>
      </div>
    </StrategyLayout>
  );
}
