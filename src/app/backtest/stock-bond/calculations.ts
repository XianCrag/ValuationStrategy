import {
  StockData,
  StrategyResult,
  TradePoint,
} from '../types';
import {
  REVIEW_INTERVAL_MONTHS,
  calculateTargetStockRatio,
  CSI300_FUND_CODE,
} from '../constants';
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

/**
 * 计算股债平衡策略
 * 
 * 策略规则：
 * 1. 初始仓位根据第一天的PE计算
 * 2. 每6个月检查一次PE，计算目标仓位
 * 3. 如果目标仓位与当前仓位不同，立即调仓
 * 4. 现金=债券，每月按国债利率计息（使用本地历史数据）
 */
export function calculateStrategy(
  stockData: StockData[],
  initialCapital: number
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
  const firstDayPE = stockData[0]['pe_ttm.mcw'];
  const firstDayPrice = stockData[0].cp;
  
  if (firstDayPE === undefined || firstDayPE === null || 
      firstDayPrice === undefined || firstDayPrice === null) {
    console.error('First day data:', stockData[0]);
    throw new Error(`First day data is incomplete: PE=${firstDayPE}, price=${firstDayPrice}`);
  }

  const initialStockRatio = calculateTargetStockRatio(firstDayPE);
  const initialStockValue = initialCapital * initialStockRatio;
  const initialCashValue = initialCapital * (1 - initialStockRatio);

  // 2. 初始化 NetWorth
  const initialNetWorth: NetWorth = {
    stockValue: [{
      code: CSI300_FUND_CODE,
      shares: initialStockValue / firstDayPrice,
      shareValue: firstDayPrice,
    }],
    cash: initialCashValue, // 现金=债券
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
    stockValueBefore: number; // 调仓前股票价值
    stockValueAfter: number;  // 调仓后股票价值
    bondValueBefore: number;  // 调仓前债券价值
    bondValueAfter: number;   // 调仓后债券价值
  }> = [];
  
  const rebalanceStrategy = (netWorth: NetWorth): NetWorth => {
    const currentDate = new Date(netWorth.date || '');
    
    // 初始化上次review日期
    if (lastReviewDate === null) {
      lastReviewDate = currentDate;
      return netWorth;
    }

    // 检查是否到了review时间（每6个月）
    const monthsSinceLastReview = moment(currentDate).diff(moment(lastReviewDate), 'months', true);
    const shouldReview = monthsSinceLastReview >= REVIEW_INTERVAL_MONTHS;

    if (!shouldReview) {
      return netWorth;
    }

    // 获取当天PE
    const todayData = stockData.find(d => d.date === netWorth.date);
    if (!todayData) {
      return netWorth;
    }

    const todayPE = todayData['pe_ttm.mcw'];
    if (todayPE === undefined || todayPE === null) {
      return netWorth;
    }

    // 计算目标仓位
    const targetStockRatio = calculateTargetStockRatio(todayPE);

    // 如果目标仓位没变，不调仓
    if (targetStockRatio === currentTargetRatio) {
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
    const csi300Stock = netWorth.stockValue.find(s => s.code === CSI300_FUND_CODE);
    if (!csi300Stock) {
      return netWorth;
    }

    // 计算调仓前的股票和债券价值
    const stockValueBefore = csi300Stock.shares * csi300Stock.shareValue;
    const bondValueBefore = netWorth.cash;

    // 计算新的股票份额
    const newShares = targetStockValue / csi300Stock.shareValue;

    // 记录交易信息（包含调仓前后的价值）
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
      annualizedReturn: baseResult.annualizedReturn, // 使用最终年化收益
    };
  });

  // 7. 提取 trades 信息（从 tradesInfo 和 netWorthTimeLine 结合）
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

  // 9. 增强年度详情（添加股债买卖信息）
  const enhancedYearlyDetails = baseResult.yearlyDetails.map((yearDetail, index) => {
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
      // 从 tradesInfo 中找到该交易的详细信息
      const tradeInfo = tradesInfo.find(t => t.date === trade.date);
      if (!tradeInfo) return;

      if (tradeInfo.type === 'buy') {
        // 买入股票：stockValueAfter > stockValueBefore
        const buyAmount = tradeInfo.stockValueAfter - tradeInfo.stockValueBefore;
        stockBuyAmount += Math.abs(buyAmount);
        
        // 卖出债券：bondValueBefore > bondValueAfter
        const sellAmount = tradeInfo.bondValueBefore - tradeInfo.bondValueAfter;
        bondSellAmount += Math.abs(sellAmount);
      } else {
        // 卖出股票：stockValueBefore > stockValueAfter
        const sellAmount = tradeInfo.stockValueBefore - tradeInfo.stockValueAfter;
        stockSellAmount += Math.abs(sellAmount);
        
        // 买入债券：bondValueAfter > bondValueBefore
        const buyAmount = tradeInfo.bondValueAfter - tradeInfo.bondValueBefore;
        bondBuyAmount += Math.abs(buyAmount);
      }
    });

    // 获取该年的起始和结束价格
    const yearStockData = stockData.filter(d => new Date(d.date).getFullYear().toString() === yearDetail.year);
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
      bondInterest: yearDetail.cashInterest || 0, // 使用 cashInterest 作为 bondInterest
      startBondValue: yearDetail.startCash, // 映射 cash 到 bondValue
      endBondValue: yearDetail.endCash, // 映射 cash 到 bondValue
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
