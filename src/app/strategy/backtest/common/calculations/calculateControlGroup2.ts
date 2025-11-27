import { StockData, ControlGroupResult } from '../../types';
import { runNetWorth } from './base';
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
  const startDate = new Date(stockData[0].date);
  const dcaEndDate = new Date(startDate);
  dcaEndDate.setMonth(dcaEndDate.getMonth() + dcaMonths);

  // 初始化净值：全部为现金，创建一个虚拟的沪深300持仓（份额为0）
  const initialNetWorth: NetWorth = {
    stockValue: [{
      code: '000300',
      shares: 0,
      shareValue: stockData[0].cp || 0,
    }],
    cash: initialCapital,
    totalValue: initialCapital,
    date: stockData[0].date,
  };

  // 追踪上次定投的月份
  let lastInvestmentMonth = '';
  let totalInvested = 0;

  // 定投策略函数
  const dcaStrategy = (netWorth: NetWorth): NetWorth => {
    const currentDate = new Date(netWorth.date || '');
    const currentMonth = moment(netWorth.date).format('YYYY-MM');

    // 检查是否需要定投
    const shouldInvest = 
      currentDate < dcaEndDate && 
      currentMonth !== lastInvestmentMonth && 
      totalInvested < initialCapital;

    if (!shouldInvest) {
      return { ...netWorth };
    }

    // 计算本次定投金额
    const remainingCapital = initialCapital - totalInvested;
    const investmentAmount = Math.min(monthlyInvestment, remainingCapital);

    if (investmentAmount <= 0 || netWorth.cash < investmentAmount) {
      return { ...netWorth };
    }

    // 获取沪深300当前价格（从更新后的 shareValue 获取）
    const csi300 = netWorth.stockValue.find(s => s.code === '000300');
    const currentPrice = csi300?.shareValue || 0;

    if (currentPrice === 0) {
      return { ...netWorth };
    }

    // 计算买入份额
    const sharesToBuy = investmentAmount / currentPrice;

    // 更新持仓
    const newStockValue = netWorth.stockValue.map(stock => {
      if (stock.code === '000300') {
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
    totalInvested += investmentAmount;

    return {
      ...netWorth,
      stockValue: newStockValue,
      cash: newCash,
      totalValue: stockTotalValue + newCash,
    };
  };

  // 调用 runNetWorth 计算净值时间线
  const netWorthTimeLine = runNetWorth(stockData, initialNetWorth, dcaStrategy);

  // 转换为 dailyValues 格式
  const dailyValues = netWorthTimeLine.map((netWorth) => ({
    date: netWorth.date || '',
    value: netWorth.totalValue,
    changePercent: ((netWorth.totalValue / initialCapital) - 1) * 100,
  }));

  // 计算最大回撤
  let maxValue = initialCapital;
  let maxDrawdown = 0;

  netWorthTimeLine.forEach((netWorth) => {
    if (netWorth.totalValue > maxValue) {
      maxValue = netWorth.totalValue;
    }
    const drawdown = maxValue > 0 ? ((maxValue - netWorth.totalValue) / maxValue) * 100 : 0;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  });

  // 计算年度详情
  const startYear = startDate.getFullYear();
  const endDate = new Date(stockData[stockData.length - 1].date);
  const endYear = endDate.getFullYear();
  const yearlyDetails: Array<{
    year: string;
    startValue: number;
    endValue: number;
    stockValue?: number;
    return: number;
    investedAmount?: number;
    finalValue?: number;
  }> = [];

  for (let year = startYear; year <= endYear; year++) {
    // 找到该年的第一天和最后一天的净值
    let yearStartNetWorth = netWorthTimeLine.find(nw => {
      const nwDate = new Date(nw.date || '');
      return nwDate.getFullYear() === year;
    });

    let yearEndNetWorth: typeof yearStartNetWorth = undefined;
    // 从后往前找该年的最后一天
    for (let i = netWorthTimeLine.length - 1; i >= 0; i--) {
      const nw = netWorthTimeLine[i];
      const nwDate = new Date(nw.date || '');
      if (nwDate.getFullYear() === year) {
        yearEndNetWorth = nw;
        break;
      }
    }

    if (!yearStartNetWorth || !yearEndNetWorth) {
      continue;
    }

    const yearStartValue = yearStartNetWorth.totalValue;
    const yearEndValue = yearEndNetWorth.totalValue;

    // 计算该年的定投金额（通过计算现金的减少量）
    const yearStartCashInvested = initialCapital - yearStartNetWorth.cash;
    const yearEndCashInvested = initialCapital - yearEndNetWorth.cash;
    const yearInvestedAmount = yearEndCashInvested - yearStartCashInvested;

    // 计算股票价值
    const stockValue = yearEndNetWorth.stockValue.reduce((sum, stock) => {
      return sum + stock.shares * stock.shareValue;
    }, 0);

    yearlyDetails.push({
      year: year.toString(),
      startValue: yearStartValue,
      endValue: yearEndValue,
      stockValue,
      return: yearStartValue > 0 ? ((yearEndValue / yearStartValue) - 1) * 100 : 0,
      investedAmount: Math.max(0, yearInvestedAmount),
      finalValue: yearEndValue,
    });
  }

  // 计算最终价值和年化收益
  const finalValue = netWorthTimeLine.length > 0
    ? netWorthTimeLine[netWorthTimeLine.length - 1].totalValue
    : initialCapital;

  const daysSinceStart = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const annualizedReturn = daysSinceStart > 0
    ? ((finalValue / initialCapital) ** (365 / daysSinceStart) - 1) * 100
    : 0;

  return {
    finalValue,
    totalReturn: ((finalValue / initialCapital) - 1) * 100,
    annualizedReturn,
    maxDrawdown,
    dailyValues,
    yearlyDetails,
  };
}
