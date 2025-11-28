import {
  StockData,
  BondData,
  StrategyResult,
  TradePoint,
} from '../types';
import {
  CSI300_FUND_STOCK,
} from '../constants';
import { METRIC_PE_TTM_MCW } from '@/constants/metrics';
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

// ERP策略默认参数
export const DEFAULT_ERP_MIN = 1; // ERP <= 1 时持仓最低
export const DEFAULT_ERP_MAX = 4; // ERP >= 4 时持仓最高
export const DEFAULT_MIN_STOCK_RATIO = 0.2; // 最低持仓 10%
export const DEFAULT_MAX_STOCK_RATIO = 0.8; // 最高持仓 60%
export const DEFAULT_POSITION_LEVELS = 6; // 仓位档位数：从最低仓位到最高仓位之间有几个目标仓位
export const DEFAULT_REVIEW_INTERVAL_MONTHS = 6; // 每6个月review一次

/**
 * ERP策略参数配置接口
 */
export interface ERPStrategyParams {
  erpMin: number; // ERP最小值
  erpMax: number; // ERP最大值
  minStockRatio: number; // 最低股票仓位 (0-1)
  maxStockRatio: number; // 最高股票仓位 (0-1)
  positionLevels: number; // 仓位档位数
  reviewIntervalMonths: number; // 复查间隔（月）
}

/**
 * 根据ERP计算目标股票仓位
 * @param erp 股权风险溢价值
 * @param params 策略参数配置
 */
export function calculateTargetStockRatioByERP(erp: number, params: ERPStrategyParams): number {
  const { erpMin, erpMax, minStockRatio, maxStockRatio, positionLevels } = params;
  
  // 先计算连续值
  let ratio: number;
  if (erp >= erpMax) {
    ratio = maxStockRatio;
  } else if (erp <= erpMin) {
    ratio = minStockRatio;
  } else {
    // 线性插值
    ratio = minStockRatio + ((erp - erpMin) / (erpMax - erpMin)) * (maxStockRatio - minStockRatio);
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
 * 计算ERP指标
 * ERP = 盈利收益率(%) - 无风险利率(%)
 * 盈利收益率 = (1 / PE) × 100%
 */
function calculateERP(pe: number, bondRate: number): number | null {
  if (!pe || pe <= 0 || bondRate === null || bondRate === undefined) {
    return null;
  }
  const earningsYield = (1 / pe) * 100; // 转换为百分比
  return earningsYield - bondRate; // bondRate已经是百分比
}

/**
 * 计算基于ERP的股债平衡策略
 * 
 * 策略规则：
 * 1. 初始仓位根据第一天的ERP计算
 * 2. 每6个月检查一次ERP，计算目标仓位
 * 3. 如果目标仓位与当前仓位不同，立即调仓
 * 4. 现金=债券，每月按国债利率计息
 */
export function calculateERPStrategy(
  aStockData: StockData[], // A股全指数据（用于获取PE）
  csi300Data: StockData[], // 沪深300基金数据（用于买入基金）
  bondData: BondData[], // 国债数据（用于获取利率）
  initialCapital: number,
  params: ERPStrategyParams // 策略参数
): StrategyResult {
  // 处理空数据
  if (aStockData.length === 0 || csi300Data.length === 0 || bondData.length === 0) {
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

  // 创建日期到国债利率的映射
  const bondRateMap = new Map<string, number>();
  bondData.forEach(item => {
    const rate = item.tcm_y10;
    if (rate !== null && rate !== undefined) {
      bondRateMap.set(item.date, rate);
    }
  });

  // 创建日期到A股全指PE的映射
  const peMap = new Map<string, number>();
  aStockData.forEach(item => {
    const pe = item[METRIC_PE_TTM_MCW];
    if (pe !== null && pe !== undefined) {
      peMap.set(item.date, pe);
    }
  });

  // 1. 计算初始ERP和初始仓位
  const firstDayPE = peMap.get(csi300Data[0].date);
  const firstDayBondRate = bondRateMap.get(csi300Data[0].date);
  const firstDayPrice = csi300Data[0].cp;
  
  if (firstDayPE === undefined || firstDayBondRate === undefined || firstDayPrice === undefined) {
    throw new Error(`First day data is incomplete: PE=${firstDayPE}, bondRate=${firstDayBondRate}, price=${firstDayPrice}`);
  }

  const firstDayERP = calculateERP(firstDayPE, firstDayBondRate);
  if (firstDayERP === null) {
    throw new Error('Cannot calculate initial ERP');
  }

  const initialStockRatio = calculateTargetStockRatioByERP(firstDayERP, params);
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
    date: csi300Data[0].date,
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
    erp: number; // 记录ERP值
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

    // 获取当天PE和国债利率
    const todayPE = peMap.get(netWorth.date || '');
    const todayBondRate = bondRateMap.get(netWorth.date || '');
    
    if (todayPE === undefined || todayBondRate === undefined) {
      return netWorth;
    }

    // 计算当天ERP
    const todayERP = calculateERP(todayPE, todayBondRate);
    if (todayERP === null) {
      return netWorth;
    }

    // 计算目标仓位
    const targetStockRatio = calculateTargetStockRatioByERP(todayERP, params);

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
      erp: todayERP,
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

  // 4. 运行模拟（使用本地 national-debt.json 的利率数据）
  const netWorthTimeLine = runNetWorth(csi300Data, initialNetWorth, rebalanceStrategy);

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
    const startDate = new Date(csi300Data[0].date);
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

  // 9. 增强年度详情（添加股债买卖信息）
  const enhancedYearlyDetails = baseResult.yearlyDetails.map((yearDetail) => {
    // 找到该年度的所有交易
    const yearTrades = trades.filter(trade => {
      const tradeYear = new Date(trade.date).getFullYear().toString();
      return tradeYear === yearDetail.year;
    });

    // 计算买入卖出金额
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

    // 获取该年的起始和结束价格
    const yearStockData = csi300Data.filter(d => new Date(d.date).getFullYear().toString() === yearDetail.year);
    const startIndexPrice = yearStockData[0]?.cp || 0;
    const endIndexPrice = yearStockData[yearStockData.length - 1]?.cp || 0;
    
    // 计算股票价格变化收益
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

