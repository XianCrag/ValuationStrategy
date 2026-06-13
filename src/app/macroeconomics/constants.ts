import { MacroIndex, MarketRegion } from './types';

/**
 * 全球主要市场板块配置
 * MVP 阶段先以静态配置呈现，后续接入实时行情时基于 code 拉取数据
 */
export const GLOBAL_MARKETS: MarketRegion[] = [
  {
    id: 'us',
    name: '美股',
    description: '美国市场主要股指',
    accent: 'blue',
    indices: [
      { code: 'SPX', symbol: 'S&P 500', name: '标普 500' },
      { code: 'IXIC', symbol: 'NASDAQ', name: '纳斯达克综合' },
      { code: 'DJI', symbol: 'DOW', name: '道琼斯工业' },
    ],
  },
  {
    id: 'cn',
    name: 'A股',
    description: '中国大陆主要股指',
    accent: 'red',
    indices: [
      { code: 'SH000001', symbol: '上证指数', name: '上证综指' },
      { code: 'SZ399001', symbol: '深证成指', name: '深证成指' },
      { code: 'SZ399006', symbol: '创业板指', name: '创业板指' },
      { code: 'SH000300', symbol: '沪深300', name: '沪深 300' },
    ],
  },
  {
    id: 'hk',
    name: '港股',
    description: '香港市场主要股指',
    accent: 'emerald',
    indices: [
      { code: 'HSI', symbol: '恒生指数', name: '恒生指数' },
      { code: 'HSTECH', symbol: '恒生科技', name: '恒生科技指数' },
      { code: 'HSCEI', symbol: '国企指数', name: '恒生中国企业指数' },
    ],
  },
  {
    id: 'jp-kr',
    name: '日 / 韩',
    description: '日本、韩国市场主要股指',
    accent: 'purple',
    indices: [
      { code: 'N225', symbol: '日经225', name: '日经 225' },
      { code: 'TOPIX', symbol: 'TOPIX', name: '东证指数' },
      { code: 'KS11', symbol: 'KOSPI', name: '韩国综合指数' },
    ],
  },
];

/** 恐慌指数（波动率指标） */
export const FEAR_INDICES: MacroIndex[] = [
  {
    code: 'VIX',
    symbol: 'VIX',
    name: '芝加哥期权交易所波动率指数',
    description: '衡量未来 30 天 S&P 500 隐含波动率，常被称为"恐慌指数"',
  },
];
