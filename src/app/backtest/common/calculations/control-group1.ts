import {
  ControlGroupResult,
  StockData,
} from '../../types';
import { runNetWorth, calculateResultFromNetWorth } from './base';

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
): ControlGroupResult {
  // 生成日期序列（现金国债策略不需要股票数据）
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

  // 使用通用函数计算结果（startDate 和 endDate 从 netWorthTimeLine 中获取）
  return calculateResultFromNetWorth(
    netWorthTimeLine,
    initialCapital,
    {
      includeCashData: true,
    }
  );
}
