'use client';

import { useState, useCallback, useEffect } from 'react';
import { StockData, BondData, StrategyResult } from '../types';
import { INITIAL_CAPITAL, A_STOCK_ALL_STOCK, CSI300_FUND_STOCK, CSI300_INDEX_STOCK, NATIONAL_DEBT_STOCK, ALL_FUNDS, StockConfig } from '../constants';
import { fetchLixingerData } from '@/lib/api';
import { setBondData } from '@/lib/backtestData';
import {
  calculateERPStrategy,
  DEFAULT_ERP_MIN,
  DEFAULT_ERP_MAX,
  DEFAULT_MIN_STOCK_RATIO,
  DEFAULT_MAX_STOCK_RATIO,
  DEFAULT_POSITION_LEVELS,
  DEFAULT_REVIEW_INTERVAL_MONTHS,
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
import TradesTable from '../components/TradesTable';
import { optimizeChartData } from '../chart-utils';
import { ChartContainer } from '../../components/Chart';
import { useBacktestData } from '../hooks/useBacktestData';
import { METRIC_CP, METRIC_PE_TTM_MCW } from '@/constants/metrics';

export default function ERPStrategyPage() {
  const [selectedYears, setSelectedYears] = useState(10);
  const [selectedFund, setSelectedFund] = useState<StockConfig>(CSI300_FUND_STOCK);
  
  // 编辑中的参数（UI绑定）
  const [editingParams, setEditingParams] = useState<ERPStrategyParams>({
    erpMin: DEFAULT_ERP_MIN,
    erpMax: DEFAULT_ERP_MAX,
    minStockRatio: DEFAULT_MIN_STOCK_RATIO,
    maxStockRatio: DEFAULT_MAX_STOCK_RATIO,
    positionLevels: DEFAULT_POSITION_LEVELS,
    reviewIntervalMonths: DEFAULT_REVIEW_INTERVAL_MONTHS,
  });

  // 实际应用的参数（用于计算）
  const [appliedParams, setAppliedParams] = useState<ERPStrategyParams>(editingParams);

  // 使用自定义Hook获取和计算数据
  const { data, result, loading, error, refetch } = useBacktestData<{
    aStockData: StockData[];
    fundData: StockData[];
    csi300IndexData: StockData[];
    bondData: BondData[];
  }, StrategyResult>({
    fetchData: useCallback(async () => {
      // 并行获取四个数据源，API 会根据 codeTypeMap 自动选择指标
      const [aStockData, fundData, csi300IndexData, bondData] = await Promise.all([
        // A股全指数据（用于获取PE）
        fetchLixingerData({
          stockCodes: [A_STOCK_ALL_STOCK.code],
          codeTypeMap: { [A_STOCK_ALL_STOCK.code]: 'index' },
          years: selectedYears,
        }),
        // 选中的基金数据（用于买入基金）
        fetchLixingerData({
          stockCodes: [selectedFund.code],
          codeTypeMap: { [selectedFund.code]: 'fund' },
          years: selectedYears,
        }),
        // 沪深300指数数据（用于图表对比）
        fetchLixingerData({
          stockCodes: [CSI300_INDEX_STOCK.code],
          codeTypeMap: { [CSI300_INDEX_STOCK.code]: 'index' },
          years: selectedYears,
        }),
        // 国债数据
        fetchLixingerData<BondData>({
          nationalDebtCodes: [NATIONAL_DEBT_STOCK.code],
          years: selectedYears,
        }),
      ]);

      return {
        aStockData: aStockData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        fundData: fundData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        csi300IndexData: csi300IndexData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        bondData: bondData as BondData[],
      };
    }, [selectedYears, selectedFund]),
    calculateResult: useCallback((data: {
      aStockData: StockData[];
      fundData: StockData[];
      csi300IndexData: StockData[];
      bondData: BondData[];
    }) => {
      if (data.aStockData.length === 0 || data.fundData.length === 0 || data.bondData.length === 0) {
        throw new Error('没有可用数据');
      }
      
      // 设置全局 bondData
      setBondData(data.bondData);
      
      // 使用选中的基金数据计算，csi300IndexData仅用于图表展示
      return calculateERPStrategy(data.aStockData, data.fundData, data.bondData, INITIAL_CAPITAL, appliedParams);
    }, [appliedParams]),
    dependencies: [selectedYears, appliedParams, selectedFund],
  });

  // 应用参数并查询
  const handleApplyParams = () => {
    setAppliedParams({...editingParams});
    refetch();
  };

  // 计算ERP数据用于图表
  const erpData = data ? calculateERPData(data.aStockData, data.bondData) : [];

  // 准备图表数据
  const rawChartData = result && data ? result.dailyStates.map((daily) => {
    const erpPoint = erpData.find(e => e.date === daily.date);
    const indexPoint = data.csi300IndexData.find(idx => idx.date === daily.date);
    
    return {
      date: daily.date,
      dateShort: formatDateShort(daily.date),
      totalValue: daily.totalValue,
      stockRatio: daily.stockRatio * 100,
      erp: erpPoint?.erp || null,
      indexPrice: indexPoint?.[METRIC_CP] || null,
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
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* ERP最小值 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ERP最小值
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={editingParams.erpMin}
                  onChange={(e) => setEditingParams({ ...editingParams, erpMin: parseFloat(e.target.value) || 0 })}
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
                  value={editingParams.erpMax}
                  onChange={(e) => setEditingParams({ ...editingParams, erpMax: parseFloat(e.target.value) || 0 })}
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
                  <li>• <strong>仓位规则：</strong> ERP {'<='} {appliedParams.erpMin} 时股票仓位最低({(appliedParams.minStockRatio * 100).toFixed(0)}%)，ERP {'>='} {appliedParams.erpMax} 时股票仓位最高({(appliedParams.maxStockRatio * 100).toFixed(0)}%)，中间离散化为{appliedParams.positionLevels}个固定档位</li>
                  <li>• <strong>仓位档位：</strong> {generatePositionLevelsText(appliedParams.positionLevels, appliedParams.minStockRatio, appliedParams.maxStockRatio)}</li>
                  <li>• <strong>调仓频率：</strong> 每{appliedParams.reviewIntervalMonths}个月检查一次，如果目标仓位发生变化则立即调仓</li>
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
                    dataKey: 'indexPrice',
                    name: '沪深300指数',
                    stroke: '#10b981',
                    strokeWidth: 2,
                    yAxisId: 'right2',
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
                    yAxisId: 'right2',
                    orientation: 'right',
                    label: '沪深300指数',
                    tickFormatter: (value) => value.toFixed(0),
                  },
                  {
                    yAxisId: 'right',
                    orientation: 'right',
                    label: 'ERP (%)',
                    tickFormatter: (value) => value.toFixed(1),
                  },
                ]}
                title="策略价值、沪深300指数与ERP变化"
                xTickFormatter={(value) => formatDateShort(value)}
                tooltipContent={(props: any) => (
                  <ChartTooltip
                    {...props}
                    dateKey="dateShort"
                    formatters={{
                      totalValue: (value) => formatNumber(value),
                      indexPrice: (value) => value !== null ? value.toFixed(2) : 'N/A',
                      erp: (value) => value !== null ? `${value.toFixed(2)}%` : 'N/A',
                    }}
                  />
                )}
                legendContent={
                  <div className="mt-4 text-sm text-gray-600">
                    <p>• <span className="text-blue-600 font-semibold">蓝线</span>：策略总价值（左侧Y轴）</p>
                    <p>• <span className="text-green-600 font-semibold">绿线</span>：沪深300指数（右侧Y轴）</p>
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
                  <TradesTable 
                    trades={result.trades}
                  />
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
        const bondRatePercent = bondRate * 100; // 将小数转换为百分比
        const erp = earningsYield - bondRatePercent;
        
        return {
          date: item.date,
          erp,
          earningsYield,
          bondRate: bondRatePercent, // 存储为百分比以便显示
          pe,
        };
      }
      return null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

