// 重新导出所有策略计算函数
export { calculateStrategy } from './strategy';
export { calculateControlGroup1 } from './control-group1';
export { calculateControlGroup2 } from './control-group2';

// 导出通用工具函数
export { runNetWorth, calculateResultFromNetWorth } from './base';
export type { YearlyDetailOptions, StockPosition } from './base';
