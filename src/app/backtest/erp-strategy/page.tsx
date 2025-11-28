'use client';

import { useState, useCallback } from 'react';
import { StockData, BondData, StrategyResult } from '../types';
import { INITIAL_CAPITAL, A_STOCK_ALL_STOCK, CSI300_FUND_STOCK, NATIONAL_DEBT_STOCK } from '../constants';
import { METRIC_PE_TTM_MCW, METRIC_CP, METRIC_TCM_Y10 } from '@/constants/metrics';
import { fetchLixingerData } from '@/lib/api';
import {
  calculateERPStrategy,
  DEFAULT_ERP_MIN,
  DEFAULT_ERP_MAX,
  DEFAULT_MIN_STOCK_RATIO,
  DEFAULT_MAX_STOCK_RATIO,
  DEFAULT_POSITION_LEVELS,
  ERPStrategyParams,
} from './calculations';
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

export default function ERPStrategyPage() {
  const [selectedYears, setSelectedYears] = useState(10);
  
  // 策略参数状态
  const [strategyParams, setStrategyParams] = useState<ERPStrategyParams>({
    erpMin: DEFAULT_ERP_MIN,
    erpMax: DEFAULT_ERP_MAX,
    minStockRatio: DEFAULT_MIN_STOCK_RATIO,
    maxStockRatio: DEFAULT_MAX_STOCK_RATIO,
    positionLevels: DEFAULT_POSITION_LEVELS,
  });

  // 使用自定义Hook获取和计算数据
  const { data, result, loading, error, refetch } = useBacktestData<{
    aStockData: StockData[];
    csi300Data: StockData[];
    bondData: BondData[];
  }, StrategyResult>({
    fetchData: useCallback(async () => {
      // 并行获取三个数据源
      const [aStockData, csi300Data, bondData] = await Promise.all([
        // A股全指数据（用于获取PE）
        fetchLixingerData({
          stockCodes: [A_STOCK_ALL_STOCK.code],
          codeTypeMap: { [A_STOCK_ALL_STOCK.code]: 'index' },
          years: selectedYears,
          metricsList: [METRIC_PE_TTM_MCW, METRIC_CP],
        }),
        // 沪深300基金数据（用于买入基金）
        fetchLixingerData({
          stockCodes: [CSI300_FUND_STOCK.code],
          codeTypeMap: { [CSI300_FUND_STOCK.code]: 'fund' },
          years: selectedYears,
          metricsList: [METRIC_CP],
        }),
        // 国债数据
        fetchLixingerData<BondData>({
          nationalDebtCodes: [NATIONAL_DEBT_STOCK.code],
          years: selectedYears,
          metricsList: [METRIC_TCM_Y10],
        }),
      ]);

      return {
        aStockData: aStockData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        csi300Data: csi300Data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        bondData: bondData as BondData[],
      };
    }, [selectedYears]),
    calculateResult: useCallback((data: {
      aStockData: StockData[];
      csi300Data: StockData[];
      bondData: BondData[];
    }) => {
      if (data.aStockData.length === 0 || data.csi300Data.length === 0 || data.bondData.length === 0) {
        throw new Error('没有可用数据');
      }
      return calculateERPStrategy(data.aStockData, data.csi300Data, data.bondData, INITIAL_CAPITAL, strategyParams);
    }, [strategyParams]),
    dependencies: [selectedYears, strategyParams],
  });

  // 计算ERP数据用于图表
  const erpData = data ? calculateERPData(data.aStockData, data.bondData) : [];

  // 准备图表数据
  const rawChartData = result && data ? result.dailyStates.map((daily) => {
    const erpPoint = erpData.find(e => e.date === daily.date);
    
    return {
      date: daily.date,
      dateShort: formatDateShort(daily.date),
      totalValue: daily.totalValue,
      stockRatio: daily.stockRatio * 100,
      erp: erpPoint?.erp || null,
    };
  }) : [];

  // 优化图表数据
  const chartData = optimizeChartData(rawChartData, {
    maxPoints: 300,
    keepFirstAndLast: true,
  });

  return (
    <StrategyLayout>
      <div className="py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            title="股权风险溢价策略（ERP Strategy）"
            description="基于股权风险溢价指标的股债动态平衡策略"
            selectedYears={selectedYears}
            onYearsChange={setSelectedYears}
          />

          {/* 策略参数配置 */}
          <div className="mb-6 p-6 bg-white rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">策略参数配置</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* ERP最小值 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ERP最小值
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={strategyParams.erpMin}
                  onChange={(e) => setStrategyParams({ ...strategyParams, erpMin: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">ERP ≤ 此值时最低仓位</p>
              </div>

              {/* ERP最大值 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ERP最大值
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={strategyParams.erpMax}
                  onChange={(e) => setStrategyParams({ ...strategyParams, erpMax: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">ERP ≥ 此值时最高仓位</p>
              </div>

              {/* 最低股票仓位 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  最低股票仓位 (%)
                </label>
                <input
                  type="number"
                  step="1"
                  value={(strategyParams.minStockRatio * 100).toFixed(0)}
                  onChange={(e) => setStrategyParams({ ...strategyParams, minStockRatio: parseFloat(e.target.value) / 100 || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">股票最低配置比例</p>
              </div>

              {/* 最高股票仓位 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  最高股票仓位 (%)
                </label>
                <input
                  type="number"
                  step="1"
                  value={(strategyParams.maxStockRatio * 100).toFixed(0)}
                  onChange={(e) => setStrategyParams({ ...strategyParams, maxStockRatio: parseFloat(e.target.value) / 100 || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">股票最高配置比例</p>
              </div>

              {/* 仓位档位数 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  仓位档位数
                </label>
                <input
                  type="number"
                  step="1"
                  min="2"
                  value={strategyParams.positionLevels}
                  onChange={(e) => setStrategyParams({ ...strategyParams, positionLevels: parseInt(e.target.value) || 2 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {generatePositionLevelsText(strategyParams.positionLevels, strategyParams.minStockRatio, strategyParams.maxStockRatio)}
                </p>
              </div>
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
                finalStockRatio={result.finalStockRatio}
              />

              {/* 策略说明 */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-2 text-blue-900">策略说明</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• <strong>ERP计算：</strong> 股权风险溢价 = 盈利收益率(%) - 无风险利率(%)，其中盈利收益率 = (1 / PE) × 100%</li>
                  <li>• <strong>仓位规则：</strong> ERP {'<='} {strategyParams.erpMin} 时股票仓位最低({(strategyParams.minStockRatio * 100).toFixed(0)}%)，ERP {'>='} {strategyParams.erpMax} 时股票仓位最高({(strategyParams.maxStockRatio * 100).toFixed(0)}%)，中间离散化为{strategyParams.positionLevels}个固定档位</li>
                  <li>• <strong>仓位档位：</strong> {generatePositionLevelsText(strategyParams.positionLevels, strategyParams.minStockRatio, strategyParams.maxStockRatio)}</li>
                  <li>• <strong>调仓频率：</strong> 每6个月检查一次，如果目标仓位发生变化则立即调仓</li>
                  <li>• <strong>数据来源：</strong> 使用A股全指PE计算ERP，买入沪深300ETF基金，现金部分享受国债利率</li>
                </ul>
              </div>

              {/* 价值变化图表 */}
              <ChartContainer
                data={chartData}
                lines={[
                  {
                    dataKey: 'totalValue',
                    name: '策略总价值',
                    stroke: '#3b82f6',
                    strokeWidth: 2,
                    yAxisId: 'left',
                  },
                  {
                    dataKey: 'erp',
                    name: 'ERP (%)',
                    stroke: '#8b5cf6',
                    strokeWidth: 2,
                    yAxisId: 'right',
                  },
                ]}
                yAxes={[
                  {
                    yAxisId: 'left',
                    orientation: 'left',
                    label: '策略总价值（元）',
                    tickFormatter: (value) => `${(value / 10000).toFixed(0)}万`,
                  },
                  {
                    yAxisId: 'right',
                    orientation: 'right',
                    label: 'ERP (%)',
                    tickFormatter: (value) => value.toFixed(1),
                  },
                ]}
                title="策略价值与ERP变化"
                xTickFormatter={(value) => formatDateShort(value)}
                tooltipContent={(props: any) => (
                  <ChartTooltip
                    {...props}
                    dateKey="dateShort"
                    formatters={{
                      totalValue: (value) => formatNumber(value),
                      erp: (value) => value !== null ? `${value.toFixed(2)}%` : 'N/A',
                    }}
                  />
                )}
                legendContent={
                  <div className="mt-4 text-sm text-gray-600">
                    <p>• <span className="text-blue-600 font-semibold">蓝线</span>：策略总价值（左侧Y轴）</p>
                    <p>• <span className="text-purple-600 font-semibold">紫线</span>：股权风险溢价ERP（右侧Y轴）</p>
                  </div>
                }
                showLegend={false}
              />

              {/* 股票仓位变化图表 */}
              <ChartContainer
                data={chartData}
                lines={[
                  {
                    dataKey: 'stockRatio',
                    name: '股票仓位 (%)',
                    stroke: '#10b981',
                    strokeWidth: 2,
                  },
                ]}
                yAxes={[
                  {
                    yAxisId: 'left',
                    label: '股票仓位 (%)',
                    domain: [0, 100],
                    tickFormatter: (value) => `${value.toFixed(0)}%`,
                  },
                ]}
                title="股票仓位变化"
                xTickFormatter={(value) => formatDateShort(value)}
                tooltipContent={(props: any) => (
                  <ChartTooltip
                    {...props}
                    dateKey="dateShort"
                    formatters={{
                      stockRatio: (value) => `${value.toFixed(2)}%`,
                    }}
                  />
                )}
              />

              {/* 交易记录 */}
              {result.trades.length > 0 && (
                <CollapsibleSection
                  buttonText={{ show: '展示交易记录', hide: '隐藏交易记录' }}
                >
                  <h3 className="text-lg font-semibold mb-2">交易记录</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 border">日期</th>
                          <th className="px-4 py-2 border">操作</th>
                          <th className="px-4 py-2 border">股票仓位</th>
                          <th className="px-4 py-2 border">股票价值</th>
                          <th className="px-4 py-2 border">债券价值</th>
                          <th className="px-4 py-2 border">总价值</th>
                          <th className="px-4 py-2 border">累计收益率</th>
                          <th className="px-4 py-2 border">年化收益率</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.trades.map((trade, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-2 border text-sm">{formatDateShort(trade.date)}</td>
                            <td className="px-4 py-2 border text-sm">
                              <span className={trade.type === 'buy' ? 'text-red-600' : 'text-green-600'}>
                                {trade.type === 'buy' ? '买入股票' : '卖出股票'}
                              </span>
                            </td>
                            <td className="px-4 py-2 border text-sm text-right">
                              {(trade.stockRatio * 100).toFixed(1)}%
                            </td>
                            <td className="px-4 py-2 border text-sm text-right">
                              {formatNumber(trade.stockValue)}
                            </td>
                            <td className="px-4 py-2 border text-sm text-right">
                              {formatNumber(trade.bondValue)}
                            </td>
                            <td className="px-4 py-2 border text-sm text-right">
                              {formatNumber(trade.totalValue)}
                            </td>
                            <td className="px-4 py-2 border text-sm text-right">
                              {trade.changePercent.toFixed(2)}%
                            </td>
                            <td className="px-4 py-2 border text-sm text-right">
                              {trade.annualizedReturn.toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CollapsibleSection>
              )}

              {/* 年度详情 */}
              <CollapsibleSection
                buttonText={{ show: '展示年度详情', hide: '隐藏年度详情' }}
              >
                <h3 className="text-lg font-semibold mb-2">年度详情</h3>
                <YearlyDetailsTable
                  yearlyDetails={result.yearlyDetails}
                  strategyType="strategy"
                  showStockPositions={true}
                />
              </CollapsibleSection>
            </>
          )}
        </div>
      </div>
    </StrategyLayout>
  );
}

/**
 * 生成仓位档位说明文本
 */
function generatePositionLevelsText(levels: number, minRatio: number, maxRatio: number): string {
  const step = (maxRatio - minRatio) / (levels - 1);
  
  const positions = Array.from({ length: levels }, (_, i) => {
    const ratio = minRatio + i * step;
    return `${(ratio * 100).toFixed(1)}%`;
  });
  
  return positions.join(', ');
}

/**
 * 计算ERP数据
 */
function calculateERPData(aStockData: StockData[], bondData: BondData[]) {
  // 创建日期到国债利率的映射
  const bondRateMap = new Map<string, number>();
  bondData.forEach(item => {
    const rate = item.tcm_y10;
    if (rate !== null && rate !== undefined) {
      bondRateMap.set(item.date, rate);
    }
  });

  // 计算ERP
  return aStockData
    .map(item => {
      const pe = item[METRIC_PE_TTM_MCW];
      const bondRate = bondRateMap.get(item.date);
      
      if (pe && pe > 0 && bondRate !== null && bondRate !== undefined) {
        const earningsYield = (1 / pe) * 100;
        const erp = earningsYield - bondRate;
        
        return {
          date: item.date,
          erp,
          earningsYield,
          bondRate,
          pe,
        };
      }
      return null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

