import {
  BondData,
  ControlGroupResult,
  StockData,
} from '../../types';
import { runNetWorth } from './base';

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

// 对照组1：现金国债
export function calculateControlGroup1(
  startDate: Date,
  endDate: Date,
  initialCapital: number,
  bondData: BondData[]
): ControlGroupResult {
  // 将 bondData 转换为 stockData 格式（用于 runNetWorth）
  // 对于现金国债策略，不需要股票数据，只需要日期序列
  const stockData: StockData[] = [];
  
  // 生成日期序列
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    stockData.push({
      date: currentDate.toISOString().split('T')[0],
      cp: 0, // 现金国债策略不持有股票
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // 初始化净值：全部为现金，无股票
  const initialNetWorth: NetWorth = {
    stockValue: [],
    cash: initialCapital,
    totalValue: initialCapital,
    date: startDate.toISOString().split('T')[0],
  };

  // 仓位调整函数：保持全部现金，不做任何操作
  const noChangeStrategy = (netWorth: NetWorth): NetWorth => {
    return { ...netWorth };
  };

  // 调用 runNetWorth 计算净值时间线
  const netWorthTimeLine = runNetWorth(stockData, initialNetWorth, noChangeStrategy);

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
    const drawdown = ((maxValue - netWorth.totalValue) / maxValue) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  });

  // 计算年度详情
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  const yearlyDetails: Array<{
    year: string;
    startValue: number;
    endValue: number;
    return: number;
    interest?: number;
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

    const yearStartValue = yearStartNetWorth?.totalValue || initialCapital;
    const yearEndValue = yearEndNetWorth?.totalValue || initialCapital;
    const interest = yearEndValue - yearStartValue;

    yearlyDetails.push({
      year: year.toString(),
      startValue: yearStartValue,
      endValue: yearEndValue,
      return: yearStartValue > 0 ? ((yearEndValue / yearStartValue) - 1) * 100 : 0,
      interest,
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
