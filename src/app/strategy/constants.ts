import { StockConfig } from './types';

// 关注的标的配置
export const WATCHED_STOCKS: StockConfig[] = [
  { code: '000300', name: '沪深300指数', type: 'index' }, // 沪深300指数
];

// 国债标的配置
export const NATIONAL_DEBT_STOCKS: StockConfig[] = [
  { code: 'tcm_y10', name: '10年期国债', type: 'interest' }, // 10年期国债
];

