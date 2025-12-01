/**
 * 全局回测数据管理器
 * 用于存储和访问回测所需的公共数据（如国债数据）
 * 避免在计算函数中频繁传递参数
 */

import { BondData } from '@/app/backtest/types';

class BacktestDataManager {
  private static instance: BacktestDataManager;
  private bondData: BondData[] = [];
  private bondRateMap: Map<string, number> = new Map();

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): BacktestDataManager {
    if (!BacktestDataManager.instance) {
      BacktestDataManager.instance = new BacktestDataManager();
    }
    return BacktestDataManager.instance;
  }

  /**
   * 设置国债数据
   */
  setBondData(data: BondData[]): void {
    this.bondData = data;
    
    // 更新映射表以加快查询速度
    this.bondRateMap.clear();
    data.forEach(item => {
      if (item.tcm_y10 !== null && item.tcm_y10 !== undefined) {
        this.bondRateMap.set(item.date, item.tcm_y10);
      }
    });
    
    console.log(`📊 全局国债数据已更新: ${data.length} 条记录`);
  }

  /**
   * 获取国债数据
   */
  getBondData(): BondData[] {
    return this.bondData;
  }

  /**
   * 获取指定日期的国债利率
   * 如果找不到精确匹配，返回最近的历史数据
   */
  getBondRate(targetDate: string): number {
    // 先尝试精确匹配
    const directRate = this.bondRateMap.get(targetDate);
    if (directRate !== undefined) {
      return directRate;
    }

    // 如果没有数据，返回默认值
    if (this.bondRateMap.size === 0) {
      console.warn('No bond data available, using default rate 3%');
      return 0.03;
    }

    // 找最近的历史数据
    const targetTime = new Date(targetDate).getTime();
    let nearestRate: number | undefined;
    let minTimeDiff = Infinity;

    this.bondRateMap.forEach((rate, date) => {
      const dateTime = new Date(date).getTime();
      const timeDiff = Math.abs(targetTime - dateTime);
      
      // 优先使用历史数据（日期<=目标日期）
      if (dateTime <= targetTime) {
        if (timeDiff < minTimeDiff) {
          minTimeDiff = timeDiff;
          nearestRate = rate;
        }
      }
    });

    // 如果找不到历史数据，使用最近的未来数据
    if (nearestRate === undefined) {
      this.bondRateMap.forEach((rate, date) => {
        const dateTime = new Date(date).getTime();
        const timeDiff = Math.abs(targetTime - dateTime);
        
        if (timeDiff < minTimeDiff) {
          minTimeDiff = timeDiff;
          nearestRate = rate;
        }
      });
    }

    return nearestRate ?? 0.03;
  }

  /**
   * 计算月度现金利息
   */
  getMonthCashInterest(date: string, cash: number): number {
    const rate = this.getBondRate(date);
    return cash * rate / 12;
  }

  /**
   * 检查是否有数据
   */
  hasData(): boolean {
    return this.bondData.length > 0;
  }

  /**
   * 清空数据
   */
  clear(): void {
    this.bondData = [];
    this.bondRateMap.clear();
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      totalRecords: this.bondData.length,
      dateRange: this.bondData.length > 0 ? {
        start: this.bondData[0].date,
        end: this.bondData[this.bondData.length - 1].date,
      } : null,
    };
  }
}

// 导出单例实例
export const backtestDataManager = BacktestDataManager.getInstance();

// 导出便捷函数
export const setBondData = (data: BondData[]) => backtestDataManager.setBondData(data);
export const getBondRate = (date: string) => backtestDataManager.getBondRate(date);
export const getMonthCashInterest = (date: string, cash: number) => backtestDataManager.getMonthCashInterest(date, cash);

