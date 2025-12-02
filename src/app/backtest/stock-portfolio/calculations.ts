/**
 * 个股组合回测策略
 * 
 * 特点：
 * 1. 支持多个股票的组合
 * 2. 可配置股票仓位比例（剩余部分为现金，享受国债利息）
 * 3. 股票按等权重分配
 */

import { StockData, ControlGroupResult, RebalanceTrade } from '../types';
import { runNetWorth, calculateResultFromNetWorth } from '../common/calculations/base';

/**
 * 个股仓位配置
 */
export interface StockPositionConfig {
  code: string; // 股票代码
  targetRatio: number; // 目标仓位比例 (0-1)
}

/**
 * 个股组合配置
 */
export interface StockPortfolioConfig {
  positions: StockPositionConfig[]; // 股票仓位配置列表
}

/**
 * 合并多个股票数据，按日期对齐
 * @param stockDataMap 股票代码到数据的映射
 * @returns 按日期对齐的数据数组
 */
export function mergeStockData(stockDataMap: Record<string, StockData[]>): StockData[] {
  // 获取所有股票代码
  const stockCodes = Object.keys(stockDataMap);
  if (stockCodes.length === 0) {
    return [];
  }

  // 获取所有日期的交集
  const dateSets = stockCodes.map(code => 
    new Set(stockDataMap[code].map(d => d.date))
  );
  
  // 找到所有股票都有数据的日期
  const commonDates = Array.from(dateSets[0]).filter(date =>
    dateSets.every(dateSet => dateSet.has(date))
  );

  // 按日期排序
  commonDates.sort();

  // 对每个日期，创建一个合并的数据点
  return commonDates.map(date => {
    // 使用第一个股票的日期作为基准
    const baseData = stockDataMap[stockCodes[0]].find(d => d.date === date)!;
    
    return {
      date,
      sp: baseData.sp, // 使用第一个股票的价格（仅用于时间序列）
      // 可以添加其他需要的字段
    };
  });
}

/**
 * 计算个股组合策略
 * 
 * @param stockDataMap 股票代码到数据数组的映射 { '600036': [...], '601988': [...] }
 * @param initialCapital 初始资金
 * @param config 组合配置
 * @returns 策略结果
 */
export function calculateStockPortfolio(
  stockDataMap: Record<string, StockData[]>,
  initialCapital: number,
  config: StockPortfolioConfig
): ControlGroupResult {
  const { positions } = config;

  // 验证参数
  if (positions.length === 0) {
    throw new Error('至少需要选择一个股票');
  }

  // 验证仓位比例总和
  const totalRatio = positions.reduce((sum, p) => sum + p.targetRatio, 0);
  if (totalRatio < 0 || totalRatio > 1) {
    throw new Error(`股票仓位比例总和必须在 0-1 之间，当前为 ${(totalRatio * 100).toFixed(2)}%`);
  }

  // 验证每个股票的仓位比例
  positions.forEach(p => {
    if (p.targetRatio < 0 || p.targetRatio > 1) {
      throw new Error(`股票 ${p.code} 的仓位比例必须在 0-1 之间`);
    }
  });

  const stockCodes = positions.map(p => p.code);

  // 合并股票数据，找到所有股票都有数据的日期
  const alignedDates = mergeStockData(stockDataMap);
  if (alignedDates.length === 0) {
    throw new Error('没有找到所有股票都有数据的日期');
  }

  // 为每个股票创建价格时间序列
  const stockPriceMap: Record<string, StockData[]> = {};
  stockCodes.forEach(code => {
    stockPriceMap[code] = alignedDates.map(({ date }) => {
      const stockData = stockDataMap[code].find(d => d.date === date)!;
      return {
        date,
        sp: stockData.sp || 0,
      };
    });
  });

  // 初始化净值：按配置的仓位比例分配
  const cashRatio = 1 - totalRatio;
  const cashAmount = initialCapital * cashRatio;

  const initialNetWorth = {
    stockValue: positions.map(position => {
      const stockAmount = initialCapital * position.targetRatio;
      const firstPrice = stockPriceMap[position.code][0].sp || 1;
      return {
        code: position.code,
        shares: stockAmount / firstPrice,
        shareValue: firstPrice,
      };
    }),
    cash: cashAmount,
    totalValue: initialCapital,
  };

  // 策略：持有不动（Buy and Hold）
  // 现金部分享受国债利息
  const holdStrategy = (netWorth: any) => {
    // 持有不变，只需要更新股票价格（这个由 runNetWorth 自动处理）
    return netWorth;
  };

  // 创建一个虚拟的统一时间序列
  const timeSeriesData = alignedDates.map(({ date }) => ({
    date,
    sp: 1, // 占位符，实际价格在 stockValue 中更新
  }));

  // 使用自定义策略来更新每个股票的价格
  const updatePricesStrategy = (netWorth: any) => {
    const date = netWorth.date;
    if (!date) return netWorth;

    // 更新每个股票的价格
    const updatedStockValue = netWorth.stockValue.map((stock: any) => {
      const stockData = stockPriceMap[stock.code]?.find(d => d.date === date);
      if (stockData && stockData.sp) {
        return {
          ...stock,
          shareValue: stockData.sp,
        };
      }
      return stock;
    });

    return {
      ...netWorth,
      stockValue: updatedStockValue,
    };
  };

  // 执行回测：先更新价格，再执行持有策略
  const netWorthTimeLine = runNetWorth(
    timeSeriesData,
    initialNetWorth,
    [updatePricesStrategy, holdStrategy]
  );

  // 计算结果
  return calculateResultFromNetWorth(netWorthTimeLine, initialCapital, {
    includeStockPositions: true,
    includeCashData: true,
  });
}

/**
 * 按设定仓位再平衡策略
 * 定期将所有股票调整回设定的目标仓位
 * 
 * @param config 组合配置（包含每个股票的目标仓位）
 * @param rebalanceMonths 再平衡间隔（月）
 * @param trades 交易记录数组
 * @param initialCapital 初始资金
 * @param startDate 起始日期
 */
export function createRebalanceStrategy(
  config: StockPortfolioConfig,
  rebalanceMonths: number,
  trades: RebalanceTrade[] = [],
  initialCapital: number = 0,
  startDate: string = ''
) {
  let lastRebalanceDate: string | null = null;

  // 创建仓位映射，便于查找
  const targetRatioMap = new Map<string, number>();
  config.positions.forEach(p => {
    targetRatioMap.set(p.code, p.targetRatio);
  });

  return (netWorth: any) => {
    if (!netWorth.date) return netWorth;

    const currentDate = new Date(netWorth.date);
    
    // 判断是否需要再平衡
    let shouldRebalance = false;
    if (!lastRebalanceDate) {
      shouldRebalance = true;
    } else {
      const lastDate = new Date(lastRebalanceDate);
      const monthsDiff = 
        (currentDate.getFullYear() - lastDate.getFullYear()) * 12 +
        (currentDate.getMonth() - lastDate.getMonth());
      
      if (monthsDiff >= rebalanceMonths) {
        shouldRebalance = true;
      }
    }

    if (!shouldRebalance) {
      return netWorth;
    }

    // 执行再平衡：将所有股票调整回目标仓位
    lastRebalanceDate = netWorth.date;
    
    // 计算当前总资产
    const totalValue = netWorth.totalValue;

    // 保存再平衡前的仓位信息
    const prevStockPositions = netWorth.stockValue.map((stock: any) => ({
      code: stock.code,
      value: stock.shares * stock.shareValue,
    }));
    const prevCashValue = netWorth.cash;

    // 按目标仓位重新分配
    const rebalancedStockValue = netWorth.stockValue.map((stock: any) => {
      const targetRatio = targetRatioMap.get(stock.code) || 0;
      const targetValue = totalValue * targetRatio;
      const targetShares = targetValue / stock.shareValue;
      
      return {
        ...stock,
        shares: targetShares,
      };
    });

    // 计算调整后的现金（总资产 - 所有股票价值）
    const totalStockValue = rebalancedStockValue.reduce(
      (sum: number, stock: any) => sum + stock.shares * stock.shareValue,
      0
    );
    const newCash = totalValue - totalStockValue;

    // 记录交易
    if (trades && trades.length !== undefined && initialCapital > 0) {
      const changePercent = ((totalValue - initialCapital) / initialCapital) * 100;
      const startDateObj = new Date(startDate || netWorth.date);
      const currentDateObj = new Date(netWorth.date);
      const years = (currentDateObj.getTime() - startDateObj.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      const annualizedReturn = years > 0 ? (Math.pow(totalValue / initialCapital, 1 / years) - 1) * 100 : 0;

      trades.push({
        date: netWorth.date,
        type: 'rebalance',
        totalValue,
        cashValue: newCash,
        stockPositions: rebalancedStockValue.map((stock: any) => ({
          code: stock.code,
          value: stock.shares * stock.shareValue,
          ratio: targetRatioMap.get(stock.code) || 0,
          price: stock.shareValue, // 记录当时的股价
        })),
        // 记录再平衡前的仓位
        prevCashValue,
        prevStockPositions,
        changePercent,
        annualizedReturn,
      });
    }

    return {
      ...netWorth,
      stockValue: rebalancedStockValue,
      cash: newCash,
    };
  };
}

/**
 * 计算个股组合策略（带再平衡）
 */
export function calculateStockPortfolioWithRebalance(
  stockDataMap: Record<string, StockData[]>,
  initialCapital: number,
  config: StockPortfolioConfig,
  rebalanceMonths: number = 3
): ControlGroupResult {
  const { positions } = config;

  // 验证参数
  if (positions.length === 0) {
    throw new Error('至少需要选择一个股票');
  }

  // 验证仓位比例总和
  const totalRatio = positions.reduce((sum, p) => sum + p.targetRatio, 0);
  if (totalRatio < 0 || totalRatio > 1) {
    throw new Error(`股票仓位比例总和必须在 0-1 之间，当前为 ${(totalRatio * 100).toFixed(2)}%`);
  }

  const stockCodes = positions.map(p => p.code);

  // 合并股票数据
  const alignedDates = mergeStockData(stockDataMap);
  if (alignedDates.length === 0) {
    throw new Error('没有找到所有股票都有数据的日期');
  }

  // 为每个股票创建价格时间序列
  const stockPriceMap: Record<string, StockData[]> = {};
  stockCodes.forEach(code => {
    stockPriceMap[code] = alignedDates.map(({ date }) => {
      const stockData = stockDataMap[code].find(d => d.date === date)!;
      return {
        date,
        sp: stockData.sp || 0,
      };
    });
  });

  // 初始化净值：按配置的仓位比例分配
  const cashRatio = 1 - totalRatio;
  const cashAmount = initialCapital * cashRatio;

  const initialNetWorth = {
    stockValue: positions.map(position => {
      const stockAmount = initialCapital * position.targetRatio;
      const firstPrice = stockPriceMap[position.code][0].sp || 1;
      return {
        code: position.code,
        shares: stockAmount / firstPrice,
        shareValue: firstPrice,
      };
    }),
    cash: cashAmount,
    totalValue: initialCapital,
  };

  // 创建时间序列
  const timeSeriesData = alignedDates.map(({ date }) => ({
    date,
    sp: 1,
  }));

  // 更新价格策略
  const updatePricesStrategy = (netWorth: any) => {
    const date = netWorth.date;
    if (!date) return netWorth;

    const updatedStockValue = netWorth.stockValue.map((stock: any) => {
      const stockData = stockPriceMap[stock.code]?.find(d => d.date === date);
      if (stockData && stockData.sp) {
        return {
          ...stock,
          shareValue: stockData.sp,
        };
      }
      return stock;
    });

    return {
      ...netWorth,
      stockValue: updatedStockValue,
    };
  };

  // 创建交易记录数组
  const trades: RebalanceTrade[] = [];
  const startDate = alignedDates[0]?.date || '';

  // 创建再平衡策略（按设定仓位）
  const rebalanceStrategy = createRebalanceStrategy(config, rebalanceMonths, trades, initialCapital, startDate);

  // 执行回测：更新价格 -> 再平衡
  const netWorthTimeLine = runNetWorth(
    timeSeriesData,
    initialNetWorth,
    [updatePricesStrategy, rebalanceStrategy]
  );

  // 计算结果
  const result = calculateResultFromNetWorth(netWorthTimeLine, initialCapital, {
    includeStockPositions: true,
    includeCashData: true,
  });

  // 返回结果包含交易记录
  return {
    ...result,
    trades,
  };
}

