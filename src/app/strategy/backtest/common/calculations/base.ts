import { StockData } from "../../types";
import nationalDebtData from "@/data/national-debt.json";
import type { NationalDebtDataFile } from "@/data/types";
import moment from "moment";

type NationalDebtData = NationalDebtDataFile;

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

export function getMonthNationalDebtRate(date: string) {
  const year = moment(date).year();
  const yearKey = year.toString();
  const yearMonth = moment(date).format('YYYY-MM');
  
  const yearData = nationalDebtData.data[yearKey as keyof typeof nationalDebtData.data];
  if (!yearData) {
    throw new Error(`No data found for year ${yearKey}`);
  }
  
  const item = yearData.find(item => item.date === yearMonth);
  if (!item) {
    throw new Error(`No data found for date ${yearMonth}`);
  }
  
  return item.tcm_y10;
}

export function getMonthCashInterest(date: string, cash: number) {
  return cash * getMonthNationalDebtRate(date) / 12;
}

// 根据股票数据 和 现金返回下个时间的总networth
export function runNetWorth(stockData: StockData[], currentNetWorth: NetWorth, changeStockRatio: (netWorth: NetWorth) => NetWorth): NetWorth[] {
  const netWorthTimeLine: NetWorth[] = [];
  let lastDate: string | null = null;
  let lastNetWorth: NetWorth = currentNetWorth;

  stockData.forEach((item: StockData, index: number) => {
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