import {
  StockData,
  StrategyResult,
  TradePoint,
} from '../types';
import {
  CSI300_FUND_STOCK,
} from '../constants';
import { METRIC_PE_TTM_MCW, METRIC_CP } from '@/constants/metrics';
import { runNetWorth, calculateResultFromNetWorth } from '../common/calculations/base';
import moment from 'moment';

type NetWorth = {
  stockValue: Array<{
    code: string;
    shares: number;
    shareValue: number;
  }>;
  cash: number;
  cashInterest?: number;
  totalValue: number;
  date?: string;
  cashChange?: number;
  stockChange?: Array<{
    code: string;
    changeShares: number;
  }>;
};

// 沪深300PE平衡策略默认参数
export const DEFAULT_PE_MIN = 11; // PE <= 11 时持仓最高
export const DEFAULT_PE_MAX = 16; // PE >= 16 时持仓最低
export const DEFAULT_MIN_STOCK_RATIO = 0.2; // 最低持仓 10%
export const DEFAULT_MAX_STOCK_RATIO = 0.8; // 最高持仓 60%
export const DEFAULT_POSITION_LEVELS = 6; // 仓位档位数
export const DEFAULT_REVIEW_INTERVAL_MONTHS = 6; // 每6个月review一次

/**
 * 沪深300PE平衡策略参数配置接口
 */
export interface CSI300PEBalanceParams {
  peMin: number; // PE最小值（高估线）
  peMax: number; // PE最大值（低估线，实际是反向的）
  minStockRatio: number; // 最低股票仓位 (0-1)
  maxStockRatio: number; // 最高股票仓位 (0-1)
  positionLevels: number; // 仓位档位数
  reviewIntervalMonths: number; // 复查间隔（月）
}

/**
 * 根据PE计算目标股票仓位
 * PE值越低，估值越低，仓位越高
 * PE值越高，估值越高，仓位越低
 * @param pe 市盈率
 * @param params 策略参数配置
 */
export function calculateTargetStockRatioByPE(pe: number, params: CSI300PEBalanceParams): number {
  const { peMin, peMax, minStockRatio, maxStockRatio, positionLevels } = params;
  
  // 先计算连续值（注意：PE低时仓位高，PE高时仓位低）
  let ratio: number;
  if (pe <= peMin) {
    ratio = maxStockRatio; // PE低，满仓
  } else if (pe >= peMax) {
    ratio = minStockRatio; // PE高，最低仓
  } else {
    // 线性插值：PE从peMin到peMax，仓位从maxStockRatio降到minStockRatio
    ratio = maxStockRatio - ((pe - peMin) / (peMax - peMin)) * (maxStockRatio - minStockRatio);
  }

  // 离散化为固定档位
  if (positionLevels === 2) {
    // 只有两个档位
    return ratio < (minStockRatio + maxStockRatio) / 2 ? minStockRatio : maxStockRatio;
  } else {
    // 计算档位间隔
    const step = (maxStockRatio - minStockRatio) / (positionLevels - 1);
    
    // 将连续值映射到最近的档位
    const levelIndex = Math.round((ratio - minStockRatio) / step);
    const discreteRatio = minStockRatio + levelIndex * step;
    
    // 确保在范围内
    return Math.max(minStockRatio, Math.min(maxStockRatio, discreteRatio));
  }
}

/**
 * 计算沪深300PE平衡策略
 * 
 * 策略规则：
 * 1. 初始仓位根据第一天的PE计算
 * 2. 每N个月检查一次PE，计算目标仓位
 * 3. 如果目标仓位与当前仓位不同，立即调仓
 * 4. 现金=债券，每月按国债利率计息
 */
export function calculateCSI300PEBalanceStrategy(
  stockData: StockData[],
  initialCapital: number,
  params: CSI300PEBalanceParams
): StrategyResult {
  // 处理空数据
  if (stockData.length === 0) {
    return {
      trades: [],
      dailyStates: [],
      finalValue: initialCapital,
      totalReturn: 0,
      annualizedReturn: 0,
      finalStockRatio: 0,
      maxDrawdown: 0,
      yearlyDetails: [],
    };
  }

  // 1. 计算初始仓位（根据第一天的PE）
  const firstDayPE = stockData[0][METRIC_PE_TTM_MCW];
  const firstDayPrice = stockData[0][METRIC_CP];
  
  if (firstDayPE === undefined || firstDayPE === null || 
      firstDayPrice === undefined || firstDayPrice === null) {
    console.error('First day data:', stockData[0]);
    throw new Error(`First day data is incomplete: PE=${firstDayPE}, price=${firstDayPrice}`);
  }

  const initialStockRatio = calculateTargetStockRatioByPE(firstDayPE, params);
  const initialStockValue = initialCapital * initialStockRatio;
  const initialCashValue = initialCapital * (1 - initialStockRatio);

  // 2. 初始化 NetWorth
  const initialNetWorth: NetWorth = {
    stockValue: [{
      code: CSI300_FUND_STOCK.code,
      shares: initialStockValue / firstDayPrice,
      shareValue: firstDayPrice,
    }],
    cash: initialCashValue,
    totalValue: initialCapital,
    date: stockData[0].date,
  };

  // 3. 定义调仓策略
  let lastReviewDate: Date | null = null;
  let currentTargetRatio = initialStockRatio;
  const tradesInfo: Array<{
    date: string;
    type: 'buy' | 'sell';
    fromRatio: number;
    toRatio: number;
    stockValueBefore: number;
    stockValueAfter: number;
    bondValueBefore: number;
    bondValueAfter: number;
    pe: number; // 记录PE值
  }> = [];
  
  const rebalanceStrategy = (netWorth: NetWorth): NetWorth => {
    const currentDate = new Date(netWorth.date || '');
    
    // 初始化上次review日期
    if (lastReviewDate === null) {
      lastReviewDate = currentDate;
      return netWorth;
    }

    // 检查是否到了review时间
    const monthsSinceLastReview = moment(currentDate).diff(moment(lastReviewDate), 'months', true);
    const shouldReview = monthsSinceLastReview >= params.reviewIntervalMonths;

    if (!shouldReview) {
      return netWorth;
    }

    // 获取当天PE
    const todayData = stockData.find(d => d.date === netWorth.date);
    if (!todayData) {
      return netWorth;
    }

    const todayPE = todayData[METRIC_PE_TTM_MCW];
    if (todayPE === undefined || todayPE === null) {
      return netWorth;
    }

    // 计算目标仓位
    const targetStockRatio = calculateTargetStockRatioByPE(todayPE, params);

    // 如果目标仓位没变（相差小于0.01），不调仓
    if (Math.abs(targetStockRatio - currentTargetRatio) < 0.01) {
      lastReviewDate = currentDate;
      return netWorth;
    }

    // 需要调仓
    const oldRatio = currentTargetRatio;
    currentTargetRatio = targetStockRatio;
    lastReviewDate = currentDate;

    // 计算目标股票和现金价值
    const targetStockValue = netWorth.totalValue * targetStockRatio;
    const targetCashValue = netWorth.totalValue * (1 - targetStockRatio);

    // 获取当前股票
    const csi300Stock = netWorth.stockValue.find(s => s.code === CSI300_FUND_STOCK.code);
    if (!csi300Stock) {
      return netWorth;
    }

    // 计算调仓前的股票和债券价值
    const stockValueBefore = csi300Stock.shares * csi300Stock.shareValue;
    const bondValueBefore = netWorth.cash;

    // 计算新的股票份额
    const newShares = targetStockValue / csi300Stock.shareValue;

    // 记录交易信息
    const tradeType: 'buy' | 'sell' = targetStockRatio > oldRatio ? 'buy' : 'sell';
    tradesInfo.push({
      date: netWorth.date || '',
      type: tradeType,
      fromRatio: oldRatio,
      toRatio: targetStockRatio,
      stockValueBefore,
      stockValueAfter: targetStockValue,
      bondValueBefore,
      bondValueAfter: targetCashValue,
      pe: todayPE,
    });

    // 返回调整后的净值
    return {
      ...netWorth,
      stockValue: [{
        ...csi300Stock,
        shares: newShares,
      }],
      cash: targetCashValue,
      totalValue: targetStockValue + targetCashValue,
    };
  };

  // 4. 运行模拟
  const netWorthTimeLine = runNetWorth(stockData, initialNetWorth, rebalanceStrategy);

  // 5. 计算结果
  const baseResult = calculateResultFromNetWorth(
    netWorthTimeLine,
    initialCapital,
    {
      includeStockPositions: true,
      includeCashData: true,
    }
  );

  // 6. 转换为 dailyStates 格式
  const dailyStates = netWorthTimeLine.map((netWorth) => {
    const stockTotalValue = netWorth.stockValue.reduce((sum, stock) => {
      return sum + stock.shares * stock.shareValue;
    }, 0);
    const stockRatio = netWorth.totalValue > 0 ? stockTotalValue / netWorth.totalValue : 0;
    
    return {
      date: netWorth.date || '',
      stockRatio,
      bondRatio: 1 - stockRatio,
      stockValue: stockTotalValue,
      bondValue: netWorth.cash,
      totalValue: netWorth.totalValue,
      changePercent: ((netWorth.totalValue / initialCapital) - 1) * 100,
      annualizedReturn: baseResult.annualizedReturn,
    };
  });

  // 7. 提取 trades 信息
  const trades: TradePoint[] = tradesInfo.map(tradeInfo => {
    const netWorth = netWorthTimeLine.find(nw => nw.date === tradeInfo.date);
    if (!netWorth) {
      return {
        date: tradeInfo.date,
        type: tradeInfo.type,
        stockRatio: tradeInfo.toRatio,
        bondRatio: 1 - tradeInfo.toRatio,
        totalValue: 0,
        stockValue: 0,
        bondValue: 0,
        changePercent: 0,
        annualizedReturn: 0,
      };
    }

    const stockTotalValue = netWorth.stockValue.reduce((sum, stock) => {
      return sum + stock.shares * stock.shareValue;
    }, 0);

    // 计算年化收益
    const startDate = new Date(stockData[0].date);
    const currentDate = new Date(tradeInfo.date);
    const daysSinceStart = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const annualizedReturn = daysSinceStart > 0 
      ? ((netWorth.totalValue / initialCapital) ** (365 / daysSinceStart) - 1) * 100 
      : 0;

    return {
      date: tradeInfo.date,
      type: tradeInfo.type,
      stockRatio: tradeInfo.toRatio,
      bondRatio: 1 - tradeInfo.toRatio,
      totalValue: netWorth.totalValue,
      stockValue: stockTotalValue,
      bondValue: netWorth.cash,
      changePercent: ((netWorth.totalValue / initialCapital) - 1) * 100,
      annualizedReturn,
    };
  });

  // 8. 计算最终股票仓位
  const lastNetWorth = netWorthTimeLine[netWorthTimeLine.length - 1];
  const finalStockValue = lastNetWorth.stockValue.reduce((sum, stock) => {
    return sum + stock.shares * stock.shareValue;
  }, 0);
  const finalStockRatio = lastNetWorth.totalValue > 0 
    ? finalStockValue / lastNetWorth.totalValue 
    : 0;

  // 9. 增强年度详情
  const enhancedYearlyDetails = baseResult.yearlyDetails.map((yearDetail) => {
    const yearTrades = trades.filter(trade => {
      const tradeYear = new Date(trade.date).getFullYear().toString();
      return tradeYear === yearDetail.year;
    });

    let stockBuyAmount = 0;
    let stockSellAmount = 0;
    let bondBuyAmount = 0;
    let bondSellAmount = 0;

    yearTrades.forEach(trade => {
      const tradeInfo = tradesInfo.find(t => t.date === trade.date);
      if (!tradeInfo) return;

      if (tradeInfo.type === 'buy') {
        const buyAmount = tradeInfo.stockValueAfter - tradeInfo.stockValueBefore;
        stockBuyAmount += Math.abs(buyAmount);
        
        const sellAmount = tradeInfo.bondValueBefore - tradeInfo.bondValueAfter;
        bondSellAmount += Math.abs(sellAmount);
      } else {
        const sellAmount = tradeInfo.stockValueBefore - tradeInfo.stockValueAfter;
        stockSellAmount += Math.abs(sellAmount);
        
        const buyAmount = tradeInfo.bondValueAfter - tradeInfo.bondValueBefore;
        bondBuyAmount += Math.abs(buyAmount);
      }
    });

    const yearStockData = stockData.filter(d => new Date(d.date).getFullYear().toString() === yearDetail.year);
    const startIndexPrice = yearStockData[0]?.[METRIC_CP] || 0;
    const endIndexPrice = yearStockData[yearStockData.length - 1]?.[METRIC_CP] || 0;
    
    const startStockValue = yearDetail.startStockValue || 0;
    const endStockValue = yearDetail.endStockValue || 0;
    
    const stockPriceChange = endIndexPrice > 0 && startIndexPrice > 0
      ? (endStockValue - startStockValue) - (stockBuyAmount - stockSellAmount)
      : 0;

    return {
      ...yearDetail,
      stockBuyAmount,
      stockSellAmount,
      bondBuyAmount,
      bondSellAmount,
      stockPriceChange,
      startIndexPrice,
      endIndexPrice,
      bondInterest: yearDetail.cashInterest || 0,
      startBondValue: yearDetail.startCash,
      endBondValue: yearDetail.endCash,
      trades: yearTrades.length,
    };
  });
  
  return {
    trades,
    dailyStates,
    finalValue: baseResult.finalValue,
    totalReturn: baseResult.totalReturn,
    annualizedReturn: baseResult.annualizedReturn,
    finalStockRatio,
    maxDrawdown: baseResult.maxDrawdown,
    yearlyDetails: enhancedYearlyDetails,
  };
}

// 向后兼容的函数名
export const calculateStrategy = calculateCSI300PEBalanceStrategy;
