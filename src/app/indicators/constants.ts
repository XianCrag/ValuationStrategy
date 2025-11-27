import { StockConfig } from './types';
import { CSI300_FUND_CODE, TCM_Y10_CODE } from '../backtest/constants';

// 关注的标的配置
export const WATCHED_STOCKS: StockConfig[] = [
  { code: CSI300_FUND_CODE, name: '沪深300ETF基金', type: 'fund' },
];

// 国债标的配置
export const NATIONAL_DEBT_STOCKS: StockConfig[] = [
  { code: TCM_Y10_CODE, name: '10年期国债', type: 'interest' },
];

// 重新导出常量，方便其他地方使用
export { CSI300_FUND_CODE, TCM_Y10_CODE } from '../backtest/constants';


