// 重新导出所有策略计算函数
export { calculateStrategy } from './calculateStrategy';
export { calculateControlGroup1 } from './calculateControlGroup1';
export { calculateControlGroup2 } from './calculateControlGroup2';

// 导出通用工具函数
export { runNetWorth, calculateResultFromNetWorth } from './base';
export type { YearlyDetailOptions, StockPosition } from './base';
