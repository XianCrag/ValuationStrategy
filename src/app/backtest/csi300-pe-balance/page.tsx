'use client';

import { useState, useCallback } from 'react';
import { StockData, StrategyResult } from '../types';
import { INITIAL_CAPITAL, CSI300_FUND_STOCK, CSI300_INDEX_STOCK, ALL_FUNDS, StockConfig } from '../constants';
import {
  calculateCSI300PEBalanceStrategy,
  DEFAULT_PE_MIN,
  DEFAULT_PE_MAX,
  DEFAULT_MIN_STOCK_RATIO,
  DEFAULT_MAX_STOCK_RATIO,
  DEFAULT_POSITION_LEVELS,
  DEFAULT_REVIEW_INTERVAL_MONTHS,
  CSI300PEBalanceParams,
} from './calculations';
import { formatDateShort, formatNumber } from '../utils';
import { fetchLixingerData } from '@/lib/api';
import StrategyLayout from '../../components/Layout';
import ErrorDisplay from '../../components/Error';
import LoadingSpinner from '../../components/LoadingSpinner';
import PageHeader from '../../components/PageHeader';
import CollapsibleSection from '../../components/CollapsibleSection';
import StrategyResultCards from '../components/StrategyResultCards';
import { YearlyDetailsTable } from '../../components/YearlyDetails';
import { optimizeChartData } from '../chart-utils';
import { ChartContainer } from '../../components/Chart';
import { ChartTooltip } from '../../components/ChartTooltips';
import { 
  METRIC_PE_TTM_MCW, 
  METRIC_CP,
} from '@/constants/metrics';
import { useBacktestData } from '../hooks/useBacktestData';

export default function CSI300PEBalancePage() {
  const [selectedYears, setSelectedYears] = useState<number>(10);
  const [selectedFund, setSelectedFund] = useState<StockConfig>(CSI300_FUND_STOCK);
  
  // 编辑中的参数（UI绑定）
  const [editingParams, setEditingParams] = useState<CSI300PEBalanceParams>({
    peMin: DEFAULT_PE_MIN,
    peMax: DEFAULT_PE_MAX,
    minStockRatio: DEFAULT_MIN_STOCK_RATIO,
    maxStockRatio: DEFAULT_MAX_STOCK_RATIO,
    positionLevels: DEFAULT_POSITION_LEVELS,
    reviewIntervalMonths: DEFAULT_REVIEW_INTERVAL_MONTHS,
  });

  // 实际应用的参数（用于计算）
  const [appliedParams, setAppliedParams] = useState<CSI300PEBalanceParams>(editingParams);

  // 使用自定义Hook获取和计算数据
  const { data, result: strategyResult, loading, error, refetch } = useBacktestData<{
    indexData: StockData[];
    fundData: StockData[];
  }, StrategyResult>({
    fetchData: useCallback(async () => {
      // 同时获取指数数据（PE）和选中的基金数据（价格）
      // API 会根据 codeTypeMap 自动选择对应的指标
      const [indexData, fundData] = await Promise.all([
        fetchLixingerData({
          stockCodes: [CSI300_INDEX_STOCK.code],
          codeTypeMap: { [CSI300_INDEX_STOCK.code]: 'index' },
          years: selectedYears,
        }),
        fetchLixingerData({
          stockCodes: [selectedFund.code],
          codeTypeMap: { [selectedFund.code]: 'fund' },
          years: selectedYears,
        }),
      ]);

      return {
        indexData: indexData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        fundData: fundData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      };
    }, [selectedYears, selectedFund]),
    calculateResult: useCallback((data: { indexData: StockData[]; fundData: StockData[] }) => {
      if (data.indexData.length === 0 || data.fundData.length === 0) {
        throw new Error('没有可用数据');
      }
      // 合并数据：将指数的PE数据合并到基金数据中
      const mergedData = data.fundData.map(fundItem => {
        const indexItem = data.indexData.find(idx => idx.date === fundItem.date);
        return {
          ...fundItem,
          [METRIC_PE_TTM_MCW]: indexItem?.[METRIC_PE_TTM_MCW],
        };
      });
      return calculateCSI300PEBalanceStrategy(mergedData, INITIAL_CAPITAL, appliedParams);
    }, [appliedParams]),
    dependencies: [selectedYears, appliedParams, selectedFund],
    autoFetch: false, // 禁用自动获取，改为手动触发
  });

  // 创建图表数据
  const rawChartData = data && strategyResult ? data.fundData.map(item => {
    const dailyState = strategyResult.dailyStates.find(s => s.date === item.date);
    const trade = strategyResult.trades.find(t => t.date === item.date);
    const indexItem = data.indexData.find(idx => idx.date === item.date);
    
    return {
      date: item.date,
      dateShort: formatDateShort(item.date),
      pe: indexItem?.[METRIC_PE_TTM_MCW],
      indexPrice: indexItem?.[METRIC_CP],
      fundPrice: item[METRIC_CP],
      hasTrade: !!trade,
      tradeType: trade?.type,
      stockRatio: (dailyState?.stockRatio ?? 0) * 100,
      totalValue: dailyState?.totalValue ?? 0,
      stockValue: dailyState?.stockValue ?? 0,
      bondValue: dailyState?.bondValue ?? 0,
    };
  }) : [];

  // 优化图表数据
  const chartData = optimizeChartData(rawChartData, {
    maxPoints: 300,
    keepFirstAndLast: true,
  });

  // 应用参数并重新计算
  const handleApplyParams = () => {
    setAppliedParams(editingParams);
    refetch();
  };

  return (
    <StrategyLayout>
      <div className="py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            title="沪深300PE平衡策略"
            description="基于沪深300指数PE的股债动态平衡策略"
            selectedYears={selectedYears}
            onYearsChange={setSelectedYears}
          />

          {/* 策略参数配置 */}
          <div className="mb-6 p-6 bg-white rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">策略参数配置</h3>
            
            {/* 基金选择 */}
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
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* PE最小值 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PE最小值（低估线）
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={editingParams.peMin}
                  onChange={(e) => setEditingParams({ ...editingParams, peMin: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">PE ≤ 此值时满仓</p>
              </div>

              {/* PE最大值 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PE最大值（高估线）
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={editingParams.peMax}
                  onChange={(e) => setEditingParams({ ...editingParams, peMax: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">PE ≥ 此值时最低仓</p>
              </div>

              {/* 最低股票仓位 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  最低股票仓位 (%)
                </label>
                <input
                  type="number"
                  step="1"
                  value={(editingParams.minStockRatio * 100).toFixed(0)}
                  onChange={(e) => setEditingParams({ ...editingParams, minStockRatio: parseFloat(e.target.value) / 100 || 0 })}
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
                  value={(editingParams.maxStockRatio * 100).toFixed(0)}
                  onChange={(e) => setEditingParams({ ...editingParams, maxStockRatio: parseFloat(e.target.value) / 100 || 0 })}
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
                  value={editingParams.positionLevels}
                  onChange={(e) => setEditingParams({ ...editingParams, positionLevels: parseInt(e.target.value) || 2 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {generatePositionLevelsText(editingParams.positionLevels, editingParams.minStockRatio, editingParams.maxStockRatio)}
                </p>
              </div>

              {/* 复查间隔 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  复查间隔（月）
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={editingParams.reviewIntervalMonths}
                  onChange={(e) => setEditingParams({ ...editingParams, reviewIntervalMonths: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">每N个月检查仓位</p>
              </div>
            </div>

            {/* 应用参数按钮 */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleApplyParams}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '计算中...' : '应用参数并重新计算'}
              </button>
            </div>
          </div>

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

              {/* 策略说明 */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-2 text-blue-900">策略说明</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• <strong>PE指标：</strong> 使用沪深300基金的市盈率（PE）作为估值指标</li>
                  <li>• <strong>仓位规则：</strong> PE {'<='} {appliedParams.peMin} 时股票仓位最高({(appliedParams.maxStockRatio * 100).toFixed(0)}%)，PE {'>='} {appliedParams.peMax} 时股票仓位最低({(appliedParams.minStockRatio * 100).toFixed(0)}%)，中间离散化为{appliedParams.positionLevels}个固定档位</li>
                  <li>• <strong>仓位档位：</strong> {generatePositionLevelsText(appliedParams.positionLevels, appliedParams.minStockRatio, appliedParams.maxStockRatio)}</li>
                  <li>• <strong>调仓频率：</strong> 每{appliedParams.reviewIntervalMonths}个月检查一次，如果目标仓位发生变化则立即调仓</li>
                  <li>• <strong>数据来源：</strong> 买入沪深300ETF基金，现金部分享受国债利率</li>
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
                    dataKey: 'indexPrice',
                    name: '沪深300指数',
                    stroke: '#10b981',
                    strokeWidth: 2,
                    yAxisId: 'right2',
                  },
                  {
                    dataKey: 'pe',
                    name: 'PE',
                    stroke: '#f59e0b',
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
                    yAxisId: 'right2',
                    orientation: 'right',
                    label: '沪深300指数',
                    tickFormatter: (value) => value.toFixed(0),
                  },
                  {
                    yAxisId: 'right',
                    orientation: 'right',
                    label: 'PE',
                    tickFormatter: (value) => value.toFixed(1),
                  },
                ]}
                title="策略价值、沪深300指数与PE变化"
                xTickFormatter={(value) => formatDateShort(value)}
                tooltipContent={(props: any) => (
                  <ChartTooltip
                    {...props}
                    dateKey="dateShort"
                    formatters={{
                      totalValue: (value) => formatNumber(value),
                      indexPrice: (value) => value !== null ? value.toFixed(2) : 'N/A',
                      pe: (value) => value !== null ? value.toFixed(2) : 'N/A',
                    }}
                  />
                )}
                legendContent={
                  <div className="mt-4 text-sm text-gray-600">
                    <p>• <span className="text-blue-600 font-semibold">蓝线</span>：策略总价值（左侧Y轴）</p>
                    <p>• <span className="text-green-600 font-semibold">绿线</span>：沪深300指数（右侧Y轴）</p>
                    <p>• <span className="text-amber-600 font-semibold">黄线</span>：沪深300PE（右侧Y轴）</p>
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
                      pe: (value) => value !== null ? `PE: ${value.toFixed(2)}` : '',
                    }}
                  />
                )}
              />

              {/* 交易记录 */}
              {strategyResult.trades.length > 0 && (
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
                        {strategyResult.trades.map((trade, index) => (
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
                  yearlyDetails={strategyResult.yearlyDetails}
                  strategyType="strategy"
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
