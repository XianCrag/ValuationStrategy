'use client';

import { useState, useCallback, useMemo } from 'react';
import { StockData, ControlGroupResult } from '../types';
import { INITIAL_CAPITAL } from '../constants';
import { ALL_INDIVIDUAL_STOCKS, StockConfig } from '@/constants/stocks';
import { fetchLixingerData } from '@/lib/api';
import { calculateStockPortfolio, calculateStockPortfolioWithRebalance, StockPositionConfig } from './calculations';
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

export default function StockPortfolioPage() {
  const [selectedYears, setSelectedYears] = useState(10);
  
  // 按行业分组股票
  const stocksByIndustry = useMemo(() => {
    const grouped: Record<string, typeof ALL_INDIVIDUAL_STOCKS> = {};
    ALL_INDIVIDUAL_STOCKS.forEach(stock => {
      const industry = stock.industry || '其他';
      if (!grouped[industry]) {
        grouped[industry] = [];
      }
      grouped[industry].push(stock);
    });
    return grouped;
  }, []);

  // 生成默认选择：每个行业的前4个股票，默认5%仓位
  const generateDefaultPositions = useCallback(() => {
    const defaultMap = new Map<string, number>();
    Object.values(stocksByIndustry).forEach(stocks => {
      // 选择每个行业的前4个股票
      stocks.slice(0, 4).forEach(stock => {
        defaultMap.set(stock.code, 0.05); // 默认5%仓位
      });
    });
    return defaultMap;
  }, [stocksByIndustry]);

  // 使用 Map 存储每个股票的配置
  const [stockPositions, setStockPositions] = useState<Map<string, number>>(() => 
    generateDefaultPositions()
  );
  
  // 是否启用再平衡
  const [enableRebalance, setEnableRebalance] = useState(true);
  
  // 编辑中的参数
  const [editingRebalanceMonths, setEditingRebalanceMonths] = useState(6);
  
  // 实际应用的参数
  const [appliedRebalanceMonths, setAppliedRebalanceMonths] = useState(6);
  const [appliedEnableRebalance, setAppliedEnableRebalance] = useState(true);

  // 计算总仓位
  const totalPosition = useMemo(() => {
    let sum = 0;
    stockPositions.forEach(ratio => {
      sum += ratio;
    });
    return sum;
  }, [stockPositions]);

  // 现金比例
  const cashRatio = Math.max(0, 1 - totalPosition);

  // 获取选中的股票列表
  const selectedStocks = useMemo(() => {
    return Array.from(stockPositions.keys());
  }, [stockPositions]);

  // 使用自定义Hook获取和计算数据
  const { data: stockDataMap, result, loading, error, refetch } = useBacktestData<
    Record<string, StockData[]>,
    ControlGroupResult
  >({
    fetchData: useCallback(async () => {
      if (selectedStocks.length === 0) {
        throw new Error('请至少选择一个股票');
      }

      // 为所有选中的股票创建 code type map
      const codeTypeMap: Record<string, 'stock' | 'index' | 'fund'> = {};
      selectedStocks.forEach(code => {
        codeTypeMap[code] = 'stock';
      });

      // 获取所有股票的数据
      // 注意：个股使用 non_financial API，不支持 cp（价格）指标
      // 不传 metricsList，让 API 返回默认字段（包括日期、市值等基础数据）
      const allStocksData = await fetchLixingerData({
        stockCodes: selectedStocks,
        codeTypeMap,
        years: selectedYears,
      });

      // 按股票代码分组（API 返回的数据中包含 stockCode 字段）
      const groupedData: Record<string, StockData[]> = {};
      selectedStocks.forEach(code => {
        groupedData[code] = [];
      });

      // 根据 stockCode 字段分组数据
      allStocksData.forEach((item: any) => {
        const code = item.stockCode;
        if (code && groupedData.hasOwnProperty(code)) {
          groupedData[code].push({
            date: item.date.split('T')[0], // 去掉时间部分，只保留日期
            sp: item.sp, // 股票价格 (stock price)
            ...item, // 展开所有字段（non_financial API 返回的默认字段）
          });
        }
      });

      // 按日期排序每个股票的数据
      Object.keys(groupedData).forEach(code => {
        groupedData[code].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
      });

      return groupedData;
    }, [selectedStocks, selectedYears]),
    calculateResult: useCallback(
      (stockDataMap: Record<string, StockData[]>) => {
        if (Object.keys(stockDataMap).length === 0) {
          throw new Error('没有可用数据');
        }

        // 构建配置对象
        const positions: StockPositionConfig[] = [];
        stockPositions.forEach((ratio, code) => {
          positions.push({ code, targetRatio: ratio });
        });

        const config = { positions };

        // 根据开关决定是否启用再平衡
        if (appliedEnableRebalance) {
          return calculateStockPortfolioWithRebalance(
            stockDataMap,
            INITIAL_CAPITAL,
            config,
            appliedRebalanceMonths
          );
        } else {
          return calculateStockPortfolio(stockDataMap, INITIAL_CAPITAL, config);
        }
      },
      [stockPositions, appliedRebalanceMonths, appliedEnableRebalance]
    ),
    dependencies: [stockPositions, selectedYears, appliedRebalanceMonths, appliedEnableRebalance],
  });

  // 准备图表数据
  const rawChartData = result
    ? result.dailyValues.map((daily) => ({
        date: daily.date,
        dateShort: formatDateShort(daily.date),
        portfolioValue: daily.value,
        changePercent: daily.changePercent,
      }))
    : [];

  // 优化图表数据
  const chartData = optimizeChartData(rawChartData, {
    maxPoints: 300,
    keepFirstAndLast: true,
  });

  // 处理股票添加/移除
  const handleStockToggle = (code: string) => {
    setStockPositions((prev) => {
      const newMap = new Map(prev);
      if (newMap.has(code)) {
        newMap.delete(code);
      } else {
        newMap.set(code, 0.05); // 默认5%仓位
      }
      return newMap;
    });
  };

  // 处理仓位调整
  const handlePositionChange = (code: string, value: number) => {
    setStockPositions((prev) => {
      const newMap = new Map(prev);
      newMap.set(code, value / 100); // 转换为小数
      return newMap;
    });
  };

  // 选择/取消选择某个行业的所有股票
  const handleIndustryToggle = (industry: string) => {
    const industryCodes = stocksByIndustry[industry].map(s => s.code);
    const allSelected = industryCodes.every(code => stockPositions.has(code));
    
    setStockPositions((prev) => {
      const newMap = new Map(prev);
      
      if (allSelected) {
        // 取消选择该行业的所有股票
        industryCodes.forEach(code => newMap.delete(code));
      } else {
        // 选择该行业的所有股票（默认5%仓位）
        industryCodes.forEach(code => {
          if (!newMap.has(code)) {
            newMap.set(code, 0.05);
          }
        });
      }
      
      return newMap;
    });
  };

  // 获取股票名称
  const getStockName = (code: string) => {
    const stock = ALL_INDIVIDUAL_STOCKS.find(s => s.code === code);
    return stock?.name || code;
  };

  return (
    <StrategyLayout>
      <div className="py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            title="个股组合回测策略"
            description="为每只股票单独设置目标仓位，支持定期再平衡至目标仓位"
            selectedYears={selectedYears}
            onYearsChange={setSelectedYears}
          />

          {/* 策略配置区域 */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">策略配置</h3>
            
            {/* 仓位总览 */}
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">仓位总览</span>
                <span className={`text-lg font-bold ${totalPosition > 1 ? 'text-red-600' : 'text-gray-900'}`}>
                  {(totalPosition * 100).toFixed(1)}% / 100%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    totalPosition > 1 ? 'bg-red-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(totalPosition * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-sm">
                <span className="text-blue-600 font-medium">
                  股票: {(totalPosition * 100).toFixed(1)}%
                </span>
                <span className="text-green-600 font-medium">
                  现金: {(cashRatio * 100).toFixed(1)}%
                </span>
              </div>
              {totalPosition > 1 && (
                <div className="mt-2 text-sm text-red-600 font-medium">
                  ⚠️ 仓位总和超过100%，请调整！
                </div>
              )}
            </div>

            {/* 再平衡配置 */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <label className="flex items-center text-sm font-medium text-gray-700 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableRebalance}
                  onChange={(e) => setEnableRebalance(e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                启用定期再平衡（定期调整至目标仓位）
              </label>
              
              {enableRebalance && (
                <div className="ml-6">
                  <label className="block text-sm text-gray-600 mb-2">
                    再平衡间隔（每 N 个月自动调整至目标仓位）
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="12"
                      value={editingRebalanceMonths}
                      onChange={(e) => setEditingRebalanceMonths(Number(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-lg font-bold text-blue-600 min-w-[80px] text-center">
                      {editingRebalanceMonths} 个月
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1个月</span>
                    <span>6个月</span>
                    <span>12个月</span>
                  </div>
                </div>
              )}
            </div>

            {/* 股票选择与仓位配置（整合） */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                股票选择与仓位配置 ({selectedStocks.length} 只已选)
              </label>
              <div className="space-y-4">
                {Object.entries(stocksByIndustry).map(([industry, stocks]) => (
                  <div key={industry} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">{industry}</h4>
                      <button
                        onClick={() => handleIndustryToggle(industry)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {stocks.every(s => stockPositions.has(s.code)) ? '取消全选' : '全选'}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {stocks.map((stock) => {
                        const isSelected = stockPositions.has(stock.code);
                        const position = (stockPositions.get(stock.code) || 5) * 100;
                        
                        return (
                          <div
                            key={stock.code}
                            onClick={() => !isSelected && handleStockToggle(stock.code)}
                            className={`p-3 rounded-lg border-2 transition-all ${
                              isSelected
                                ? 'bg-blue-50 border-blue-300'
                                : 'bg-gray-50 border-transparent hover:border-gray-300 hover:bg-gray-100 cursor-pointer'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 text-sm">{stock.name}</div>
                                <div className="text-xs text-gray-500">{stock.code}</div>
                              </div>
                              {isSelected && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStockToggle(stock.code);
                                  }}
                                  className="ml-2 px-2 py-1 text-xs font-medium rounded transition-colors bg-red-100 text-red-600 hover:bg-red-200"
                                >
                                  移除
                                </button>
                              )}
                            </div>
                            
                            {isSelected && (
                              <div className="mt-3 pt-3 border-t border-blue-200">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-gray-600">仓位</span>
                                  <span className="text-sm font-bold text-blue-600">
                                    {position.toFixed(1)}%
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  step="1"
                                  value={position}
                                  onChange={(e) => handlePositionChange(stock.code, Number(e.target.value))}
                                  className="w-full h-1.5 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                                  <span>0%</span>
                                  <span>50%</span>
                                  <span>100%</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 查询按钮 */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setAppliedRebalanceMonths(editingRebalanceMonths);
                  setAppliedEnableRebalance(enableRebalance);
                }}
                disabled={loading || selectedStocks.length === 0}
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '计算中...' : '查询回测结果'}
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
              />

              {/* 组合价值变化折线图 */}
              <ChartContainer
                data={chartData}
                lines={[
                  {
                    dataKey: 'portfolioValue',
                    name: '组合总价值',
                    stroke: '#3b82f6',
                    strokeWidth: 2,
                  },
                ]}
                yAxes={[
                  {
                    yAxisId: 'left',
                    orientation: 'left',
                    label: '组合价值（元）',
                    tickFormatter: (value) => `${(value / 10000).toFixed(0)}万`,
                  },
                ]}
                title="组合价值变化"
                xTickFormatter={(value) => formatDateShort(value)}
                tooltipContent={(props: any) => (
                  <ChartTooltip
                    {...props}
                    dateKey="dateShort"
                    formatters={{
                      portfolioValue: (value) => formatNumber(value),
                      changePercent: (value) => `${value.toFixed(2)}%`,
                    }}
                  />
                )}
                legendContent={
                  <div className="mt-4 text-sm text-gray-600">
                    <p>• <span className="text-blue-600 font-semibold">蓝线</span>：组合总价值（股票 {(totalPosition * 100).toFixed(1)}% + 现金 {(cashRatio * 100).toFixed(1)}%）</p>
                    {appliedEnableRebalance ? (
                      <p className="mt-1">• 每 {appliedRebalanceMonths} 个月自动再平衡至目标仓位</p>
                    ) : (
                      <p className="mt-1">• 买入并持有策略（不进行再平衡）</p>
                    )}
                  </div>
                }
                showLegend={false}
              />

              {/* 交易记录 - 仅在启用再平衡时显示 */}
              {appliedEnableRebalance && result.trades && result.trades.length > 0 && (
                <CollapsibleSection
                  buttonText={{ show: '展示交易记录', hide: '隐藏交易记录' }}
                >
                  <h3 className="text-lg font-semibold mb-2">交易记录（再平衡）</h3>
                  <TradesTable 
                    trades={result.trades} 
                    getStockName={getStockName}
                  />
                </CollapsibleSection>
              )}

              <CollapsibleSection
                buttonText={{ show: '展示年度详情', hide: '隐藏年度详情' }}
              >
                <h3 className="text-lg font-semibold mb-2">年度详情</h3>
                <YearlyDetailsTable
                  yearlyDetails={result.yearlyDetails}
                  strategyType="portfolio"
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
