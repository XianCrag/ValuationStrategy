import { StockData, ControlGroupResult } from '../../types';
import { runNetWorth, calculateResultFromNetWorth } from './base';
import moment from 'moment';
import { CSI300_FUND_CODE } from '../../constants';

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

// 对照组2：定投沪深300
export function calculateControlGroup2(
  stockData: StockData[],
  initialCapital: number,
  dcaMonths: number,
): ControlGroupResult {
  if (stockData.length === 0) {
    return {
      finalValue: initialCapital,
      totalReturn: 0,
      annualizedReturn: 0,
      maxDrawdown: 0,
      dailyValues: [],
      yearlyDetails: [],
    };
  }
  
  const monthlyInvestment = initialCapital / dcaMonths;

  // 初始化净值：全部为现金，创建一个虚拟的沪深300持仓（份额为0）
  const initialNetWorth: NetWorth = {
    stockValue: [{
      code: CSI300_FUND_CODE,
      shares: 0,
      shareValue: stockData[0].cp || 0,
    }],
    cash: initialCapital,
    totalValue: initialCapital,
    date: stockData[0].date,
  };

  // 追踪上次定投的月份
  let lastInvestmentMonth = '';

  // 定投策略函数
  const dcaStrategy = (netWorth: NetWorth): NetWorth => {
    const currentMonth = moment(netWorth.date).format('YYYY-MM');

    // 检查是否需要定投
    const shouldInvest = currentMonth !== lastInvestmentMonth;

    if (!shouldInvest || netWorth.cash === 0) {
      return { ...netWorth };
    }

    // 计算本次定投金额
    const investmentAmount = Math.min(monthlyInvestment, netWorth.cash);

    // 获取沪深300基金当前价格（从更新后的 shareValue 获取）
    const csi300 = netWorth.stockValue.find(s => s.code === CSI300_FUND_CODE);
    const currentPrice = csi300?.shareValue || 0;

    // 计算买入份额
    const sharesToBuy = investmentAmount / currentPrice;

    // 更新持仓
    const newStockValue = netWorth.stockValue.map(stock => {
      if (stock.code === CSI300_FUND_CODE) {
        return {
          ...stock,
          shares: stock.shares + sharesToBuy,
        };
      }
      return stock;
    });

    // 更新现金和总价值
    const newCash = netWorth.cash - investmentAmount;
    const stockTotalValue = newStockValue.reduce((sum, stock) => {
      return sum + stock.shares * stock.shareValue;
    }, 0);

    lastInvestmentMonth = currentMonth;

    return {
      ...netWorth,
      stockValue: newStockValue,
      cash: newCash,
      totalValue: stockTotalValue + newCash,
    };
  };

  // 调用 runNetWorth 计算净值时间线
  const netWorthTimeLine = runNetWorth(stockData, initialNetWorth, dcaStrategy);

  console.log('netWorthTimeLine', netWorthTimeLine);

  // 使用通用函数计算结果（startDate 和 endDate 从 netWorthTimeLine 中获取）
  return calculateResultFromNetWorth(
    netWorthTimeLine,
    initialCapital,
    {
      includeStockPositions: true,
      includeCashData: true,
      includeInvestedAmount: true,
    }
  );
}
