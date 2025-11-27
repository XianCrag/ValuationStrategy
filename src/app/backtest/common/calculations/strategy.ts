import {
  StockData,
  BondData,
  StrategyResult,
} from '../../types';
import {
  REVIEW_INTERVAL_MONTHS,
  REBALANCE_THRESHOLD,
  calculateTargetStockRatio,
} from '../../constants';

// 计算策略结果
export function calculateStrategy(
  stockData: StockData[],
  bondData: BondData[],
  initialCapital: number
): StrategyResult {
  const trades: Array<{
    date: string;
    type: 'buy' | 'sell';
    stockRatio: number;
    bondRatio: number;
    totalValue: number;
    stockValue: number;
    bondValue: number;
    changePercent: number;
    annualizedReturn: number;
  }> = [];
  const dailyStates: Array<{
    date: string;
    stockRatio: number;
    bondRatio: number;
    stockValue: number;
    bondValue: number;
    totalValue: number;
    changePercent: number;
    annualizedReturn: number;
  }> = [];
  let currentStockRatio = 0.6; // 初始仓位60%
  let stockValue = initialCapital * currentStockRatio;
  let bondValue = initialCapital * (1 - currentStockRatio);
  let totalValue = initialCapital;
  
  // 创建日期到数据的映射
  const stockMap = new Map<string, StockData>();
  stockData.forEach(item => {
    stockMap.set(item.date, item);
  });
  
  const bondMap = new Map<string, BondData>();
  bondData.forEach(item => {
    bondMap.set(item.date, item);
  });
  
  // 获取所有日期，按时间排序
  const allDates = Array.from(new Set([...stockMap.keys(), ...bondMap.keys()]))
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  
  // 按季度review（每3个月）
  let lastReviewDate: Date | null = null;
  let startDate: Date | null = null;
  let peakValue = initialCapital;
  let maxDrawdown = 0;
  let lastStockPrice = 0;
  let lastBondRate = 0;
  
  const yearlyDetails: Array<{
    year: string;
    startValue: number;
    endValue: number;
    startStockValue: number;
    endStockValue: number;
    stockBuyAmount: number;
    stockSellAmount: number;
    stockPriceChange: number;
    startIndexPrice: number;
    endIndexPrice: number;
    startBondValue: number;
    endBondValue: number;
    bondBuyAmount: number;
    bondSellAmount: number;
    bondInterest: number;
    return: number;
    trades: number;
  }> = [];
  
  let currentYear = '';
  let yearStartValue = initialCapital;
  let yearStartStockValue = initialCapital * 0.6;
  let yearStartBondValue = initialCapital * 0.4;
  let yearTrades = 0;
  let yearStockBuyAmount = 0;
  let yearStockSellAmount = 0;
  let yearBondBuyAmount = 0;
  let yearBondSellAmount = 0;
  let yearStartStockPrice = 0;
  let yearStartBondRate = 0;
  let yearBondValueSum = 0;
  let yearBondValueCount = 0;
  
  for (const dateStr of allDates) {
    const date = new Date(dateStr);
    const stockItem = stockMap.get(dateStr);
    const bondItem = bondMap.get(dateStr);
    
    if (!stockItem || !bondItem) continue;
    
    const pe = stockItem['pe_ttm.mcw'];
    const stockPrice = stockItem.cp;
    const bondRate = bondItem.tcm_y10;
    
    if (pe === undefined || pe === null || bondRate === undefined || bondRate === null) continue;
    if (stockPrice === undefined || stockPrice === null) continue;
    
    // 初始化
    if (lastStockPrice === 0) {
      lastStockPrice = stockPrice;
      lastBondRate = bondRate;
      startDate = date;
      lastReviewDate = date;
      const firstYear = date.getFullYear().toString();
      currentYear = firstYear;
      yearStartValue = initialCapital;
      yearStartStockValue = initialCapital * currentStockRatio;
      yearStartBondValue = initialCapital * (1 - currentStockRatio);
      yearStartStockPrice = stockPrice;
      yearStartBondRate = bondRate;
      yearBondValueSum = yearStartBondValue;
      yearBondValueCount = 1;
      continue;
    }
    
    // 计算股票收益（每日更新，基于价格变化）
    const stockReturn = (stockPrice - lastStockPrice) / lastStockPrice;
    stockValue = stockValue * (1 + stockReturn);
    
    totalValue = stockValue + bondValue;
    
    yearBondValueSum += bondValue;
    yearBondValueCount++;
    
    // 计算当前年化收益
    const daysSinceStart = startDate ? Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const currentAnnualizedReturn = daysSinceStart > 0 ? ((totalValue / initialCapital) ** (365 / daysSinceStart) - 1) * 100 : 0;
    
    // 记录每日状态
    dailyStates.push({
      date: dateStr,
      stockRatio: currentStockRatio,
      bondRatio: 1 - currentStockRatio,
      stockValue,
      bondValue,
      totalValue,
      changePercent: ((totalValue / initialCapital) - 1) * 100,
      annualizedReturn: currentAnnualizedReturn,
    });
    
    // 计算最大回撤
    if (totalValue > peakValue) {
      peakValue = totalValue;
    }
    const drawdown = ((peakValue - totalValue) / peakValue) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
    
    // 检查是否需要review（每6个月）
    const shouldReview = lastReviewDate && 
      (date.getTime() - lastReviewDate.getTime()) >= REVIEW_INTERVAL_MONTHS * 30 * 24 * 60 * 60 * 1000;
    
    if (shouldReview) {
      const targetStockRatio = calculateTargetStockRatio(pe);
      
      if (Math.abs(targetStockRatio - currentStockRatio) > REBALANCE_THRESHOLD) {
        const tradeType = targetStockRatio > currentStockRatio ? 'buy' : 'sell';
        
        const targetStockValue = totalValue * targetStockRatio;
        const targetBondValue = totalValue * (1 - targetStockRatio);
        const stockDiff = targetStockValue - stockValue;
        const bondDiff = targetBondValue - bondValue;
        
        if (stockDiff > 0) {
          yearStockBuyAmount += stockDiff;
          yearBondSellAmount += Math.abs(bondDiff);
        } else {
          yearStockSellAmount += Math.abs(stockDiff);
          yearBondBuyAmount += bondDiff;
        }
        
        stockValue = targetStockValue;
        bondValue = targetBondValue;
        currentStockRatio = targetStockRatio;
        const daysSinceStart = Math.floor((date.getTime() - (startDate || date).getTime()) / (1000 * 60 * 60 * 24));
        const annualizedReturn = daysSinceStart > 0 ? ((totalValue / initialCapital) ** (365 / daysSinceStart) - 1) * 100 : 0;
        
        trades.push({
          date: dateStr,
          type: tradeType,
          stockRatio: currentStockRatio,
          bondRatio: 1 - currentStockRatio,
          totalValue,
          stockValue,
          bondValue,
          changePercent: ((totalValue / initialCapital) - 1) * 100,
          annualizedReturn,
        });
        
        yearTrades++;
      }
      
      lastReviewDate = date;
    }
    
    // 更新年度统计
    const year = date.getFullYear().toString();
    const isYearEnd = year !== currentYear;
    
    if (isYearEnd) {
      const averageBondValue = yearBondValueCount > 0 ? yearBondValueSum / yearBondValueCount : yearStartBondValue;
      const bondInterest = averageBondValue * yearStartBondRate;
      bondValue = bondValue + bondInterest;
      totalValue = stockValue + bondValue;
      
      const stockPriceChangeRate = (stockPrice - yearStartStockPrice) / yearStartStockPrice;
      const stockPriceChange = yearStartStockValue * stockPriceChangeRate;
      
      yearlyDetails.push({
        year: currentYear,
        startValue: yearStartValue,
        endValue: totalValue,
        startStockValue: yearStartStockValue,
        endStockValue: stockValue,
        stockBuyAmount: yearStockBuyAmount,
        stockSellAmount: yearStockSellAmount,
        stockPriceChange: stockPriceChange,
        startIndexPrice: yearStartStockPrice,
        endIndexPrice: stockPrice,
        startBondValue: yearStartBondValue,
        endBondValue: bondValue,
        bondBuyAmount: yearBondBuyAmount,
        bondSellAmount: yearBondSellAmount,
        bondInterest: bondInterest,
        return: ((totalValue / yearStartValue) - 1) * 100,
        trades: yearTrades,
      });
      
      currentYear = year;
      yearStartValue = totalValue;
      yearStartStockValue = stockValue;
      yearStartBondValue = bondValue;
      yearStartStockPrice = stockPrice;
      yearStartBondRate = bondRate;
      yearTrades = 0;
      yearStockBuyAmount = 0;
      yearStockSellAmount = 0;
      yearBondBuyAmount = 0;
      yearBondSellAmount = 0;
      yearBondValueSum = bondValue;
      yearBondValueCount = 1;
    }
    
    lastStockPrice = stockPrice;
    lastBondRate = bondRate;
  }
  
  // 添加最后一年
  if (currentYear !== '') {
    const lastAverageBondValue = yearBondValueCount > 0 ? yearBondValueSum / yearBondValueCount : yearStartBondValue;
    const lastBondInterest = lastAverageBondValue * yearStartBondRate;
    const finalBondValue = bondValue + lastBondInterest;
    const finalTotalValue = stockValue + finalBondValue;
    
    const lastStockPriceChangeRate = (lastStockPrice - yearStartStockPrice) / yearStartStockPrice;
    const lastStockPriceChange = yearStartStockValue * lastStockPriceChangeRate;
    
    yearlyDetails.push({
      year: currentYear,
      startValue: yearStartValue,
      endValue: finalTotalValue,
      startStockValue: yearStartStockValue,
      endStockValue: stockValue,
      stockBuyAmount: yearStockBuyAmount,
      stockSellAmount: yearStockSellAmount,
      stockPriceChange: lastStockPriceChange,
      startIndexPrice: yearStartStockPrice,
      endIndexPrice: lastStockPrice,
      startBondValue: yearStartBondValue,
      endBondValue: finalBondValue,
      bondBuyAmount: yearBondBuyAmount,
      bondSellAmount: yearBondSellAmount,
      bondInterest: lastBondInterest,
      return: ((finalTotalValue / yearStartValue) - 1) * 100,
      trades: yearTrades,
    });
    
    totalValue = finalTotalValue;
    bondValue = finalBondValue;
  }
  
  const daysSinceStart = startDate ? Math.floor((new Date(allDates[allDates.length - 1]).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const annualizedReturn = daysSinceStart > 0 ? ((totalValue / initialCapital) ** (365 / daysSinceStart) - 1) * 100 : 0;
  
  return {
    trades,
    dailyStates,
    finalValue: totalValue,
    totalReturn: ((totalValue / initialCapital) - 1) * 100,
    annualizedReturn,
    finalStockRatio: currentStockRatio,
    maxDrawdown,
    yearlyDetails,
  };
}

