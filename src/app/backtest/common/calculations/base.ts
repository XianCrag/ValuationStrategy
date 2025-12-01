import { StockData, BondData } from "../../types";
import { backtestDataManager } from "@/lib/backtestData";
import moment from "moment";

type StockValue = {
  code: string;
  shares: number;
  shareValue: number;
}

type StockChange = {
  code: string;
  changeShares: number;
}

type NetWorth = {
  stockValue: StockValue[];
  cash: number;
  cashInterest?: number;
  totalValue: number;
  date?: string;
  cashChange?: number;
  stockChange?: StockChange[];
}

/**
 * 获取指定日期的国债利率（从全局数据管理器）
 */
export function getMonthNationalDebtRate(date: string) {
  return backtestDataManager.getBondRate(date);
}

/**
 * 根据国债利率计算现金利息（从全局数据管理器）
 */
export function getMonthCashInterest(date: string, cash: number) {
  return backtestDataManager.getMonthCashInterest(date, cash);
}

/**
 * 从 bondData 中获取指定日期的国债利率
 * @param date 日期字符串
 * @param bondData 债券数据数组
 * @returns 国债利率，如果找不到则返回默认值 0.03
 */
export function getBondRate(date: string, bondData?: BondData[]): number {
  if (!bondData || bondData.length === 0) {
    return 0.03; // 默认3%
  }
  
  const bondItem = bondData.find(b => b.date === date);
  return bondItem?.tcm_y10 ?? 0.03;
}

/**
 * 根据 bondData 计算现金利息
 * @param date 日期字符串
 * @param cash 现金金额
 * @param bondData 债券数据数组（可选）
 * @returns 月度利息
 */
export function getMonthCashInterestFromBondData(date: string, cash: number, bondData?: BondData[]): number {
  const rate = getBondRate(date, bondData);
  return cash * rate / 12;
}

// 根据股票数据 和 现金返回下个时间的总networth
export function runNetWorth(
  stockData: StockData[], 
  currentNetWorth: NetWorth, 
  changeStockRatio: (netWorth: NetWorth) => NetWorth,
  bondData?: BondData[] // 保留参数以兼容旧代码，但不再使用
): NetWorth[] {
  const netWorthTimeLine: NetWorth[] = [];
  let lastDate: string | null = null;
  let lastNetWorth: NetWorth = currentNetWorth;

  stockData.forEach((item: StockData) => {
    const { date, cp } = item;
    
    // 初始化当日净值，继承上一日的数据
    const dateNetWorth: NetWorth = {
      stockValue: lastNetWorth.stockValue.map((stock) => ({
        ...stock,
        shareValue: cp || stock.shareValue,
      })),
      cash: lastNetWorth.cash,
      totalValue: 0,
      date: date,
    };

    // 计算现金利息
    if (!lastDate) {
      lastDate = moment(date).format('YYYY-MM');
    }
    
    // 如果月份变了，则计算现金利息
    const currentMonth = moment(date).format('YYYY-MM');
    if (currentMonth !== lastDate) {
      // 使用全局数据管理器获取国债利率
      dateNetWorth.cashInterest = getMonthCashInterest(date, dateNetWorth.cash);
      dateNetWorth.cash = dateNetWorth.cash + dateNetWorth.cashInterest;
      lastDate = currentMonth;
    }

    // 计算股票总价值
    const stockTotalValue = dateNetWorth.stockValue.reduce((sum, stock) => {
      return sum + stock.shares * stock.shareValue;
    }, 0);

    // 计算总价值
    dateNetWorth.totalValue = stockTotalValue + dateNetWorth.cash;

    // 仓位调整
    const afterChangeNetWorth = changeStockRatio(dateNetWorth);

    // 重新计算总价值
    const afterStockTotalValue = afterChangeNetWorth.stockValue.reduce((sum, stock) => {
      return sum + stock.shares * stock.shareValue;
    }, 0);
    afterChangeNetWorth.totalValue = afterStockTotalValue + afterChangeNetWorth.cash;

    // 计算仓位如何调整，cash变化， 和 股票share变化
    afterChangeNetWorth.cashChange = afterChangeNetWorth.cash - dateNetWorth.cash;
    afterChangeNetWorth.stockChange = afterChangeNetWorth.stockValue.map((afterStock) => {
      const beforeStock = dateNetWorth.stockValue.find(s => s.code === afterStock.code);
      return {
        code: afterStock.code,
        changeShares: afterStock.shares - (beforeStock?.shares || 0),
      };
    });

    lastNetWorth = afterChangeNetWorth;
    netWorthTimeLine.push(lastNetWorth);
  });
  
  return netWorthTimeLine;
}

export type StockPosition = {
  code: string;
  shares: number;
  value: number;
  price: number;
};

export type YearlyDetailOptions = {
  includeStockPositions?: boolean; // 是否包含股票持仓详情
  includeCashData?: boolean; // 是否包含现金数据
  includeInvestedAmount?: boolean; // 是否计算定投金额
  initialCapital?: number; // 初始资金（用于计算定投金额）
};

/**
 * 通用函数：从 netWorthTimeLine 计算结果数据
 * @param netWorthTimeLine 净值时间线
 * @param initialCapital 初始资金
 * @param options 可选配置
 */
export function calculateResultFromNetWorth(
  netWorthTimeLine: NetWorth[],
  initialCapital: number,
  options: YearlyDetailOptions = {}
) {
  // 从 netWorthTimeLine 中获取开始和结束日期
  if (netWorthTimeLine.length === 0) {
    throw new Error('netWorthTimeLine cannot be empty');
  }
  
  const startDate = new Date(netWorthTimeLine[0].date || '');
  const endDate = new Date(netWorthTimeLine[netWorthTimeLine.length - 1].date || '');
  const {
    includeStockPositions = false,
    includeCashData = false,
    includeInvestedAmount = false,
  } = options;

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
  const endYear = endDate.getFullYear();
  const yearlyDetails: Array<{
    year: string;
    startValue: number;
    endValue: number;
    stockValue?: number;
    return: number;
    investedAmount?: number;
    startStockValue?: number;
    endStockValue?: number;
    startCash?: number;
    endCash?: number;
    startStockPositions?: StockPosition[];
    endStockPositions?: StockPosition[];
    interest?: number;
    cashInterest?: number;
  }> = [];
  
  for (let year = startYear; year <= endYear; year++) {
    // 找到该年的第一天和最后一天的净值
    const yearStartNetWorth = netWorthTimeLine.find(nw => {
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

    const yearDetail: {
      year: string;
      startValue: number;
      endValue: number;
      stockValue?: number;
      return: number;
      investedAmount?: number;
      startStockValue?: number;
      endStockValue?: number;
      startCash?: number;
      endCash?: number;
      startStockPositions?: StockPosition[];
      endStockPositions?: StockPosition[];
      interest?: number;
      cashInterest?: number;
    } = {
      year: year.toString(),
      startValue: yearStartValue,
      endValue: yearEndValue,
      return: yearStartValue > 0 ? ((yearEndValue / yearStartValue) - 1) * 100 : 0,
    };

    // 计算股票价值
    const startStockValue = yearStartNetWorth.stockValue.reduce((sum, stock) => {
      return sum + stock.shares * stock.shareValue;
    }, 0);
    
    const endStockValue = yearEndNetWorth.stockValue.reduce((sum, stock) => {
      return sum + stock.shares * stock.shareValue;
    }, 0);

    yearDetail.startStockValue = startStockValue;
    yearDetail.endStockValue = endStockValue;

    // 如果需要股票持仓详情
    if (includeStockPositions) {
      const startStockPositions: StockPosition[] = yearStartNetWorth.stockValue
        .filter(stock => stock.shares > 0)
        .map(stock => ({
          code: stock.code,
          shares: stock.shares,
          value: stock.shares * stock.shareValue,
          price: stock.shareValue,
        }));

      const endStockPositions: StockPosition[] = yearEndNetWorth.stockValue
        .filter(stock => stock.shares > 0)
        .map(stock => ({
          code: stock.code,
          shares: stock.shares,
          value: stock.shares * stock.shareValue,
          price: stock.shareValue,
        }));

      yearDetail.startStockPositions = startStockPositions;
      yearDetail.endStockPositions = endStockPositions;
    }

    // 如果需要现金数据
    if (includeCashData) {
      yearDetail.startCash = yearStartNetWorth.cash;
      yearDetail.endCash = yearEndNetWorth.cash;
      
      // 计算该年度累计的现金利息（从 netWorthTimeLine 中累加该年的所有 cashInterest）
      const yearStartIndex = netWorthTimeLine.findIndex(nw => {
        const nwDate = new Date(nw.date || '');
        return nwDate.getFullYear() === year;
      });
      
      const yearEndIndex = netWorthTimeLine.length - 1 - [...netWorthTimeLine].reverse().findIndex(nw => {
        const nwDate = new Date(nw.date || '');
        return nwDate.getFullYear() === year;
      });
      
      let yearCashInterest = 0;
      for (let i = yearStartIndex; i <= yearEndIndex && i >= 0; i++) {
        if (netWorthTimeLine[i].cashInterest !== undefined) {
          yearCashInterest += netWorthTimeLine[i].cashInterest!;
        }
      }
      
      yearDetail.cashInterest = yearCashInterest;
    }

    // 如果需要计算定投金额
    if (includeInvestedAmount && initialCapital !== undefined) {
      const yearStartCashInvested = initialCapital - yearStartNetWorth.cash;
      const yearEndCashInvested = initialCapital - yearEndNetWorth.cash;
      const yearInvestedAmount = yearEndCashInvested - yearStartCashInvested;
      yearDetail.investedAmount = Math.max(0, yearInvestedAmount);
    }
    
    yearlyDetails.push(yearDetail);
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