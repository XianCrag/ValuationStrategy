import { StockData } from "../../types";

type StockValue = {
  code: string;
  shares: number;
}

type NetWorth = {
  stockValue: StockValue[];
  cash: number;
  totalValue: number;
}

// 根据股票数据 和 现金返回下个时间的总networth
export function runNetWorth(stockData: StockData[], currentNetWorth: NetWorth): NetWorth {
    return {
        stockValue: [],
        cash: 0,
        totalValue: 0,
    }   
}