/**
 * 宏观经济模块 - 类型定义
 *
 * MVP 阶段仅定义最基础的结构，后续接入数据源时再扩展字段
 * （如：最新价、涨跌幅、历史数据、更新时间等）。
 */

/** 单个指数 / 指标的元信息 */
export interface MacroIndex {
  /** 唯一标识，用于后续数据请求 */
  code: string;
  /** 显示名称 */
  name: string;
  /** 可选的英文 / 别名 */
  symbol?: string;
  /** 简要描述 */
  description?: string;
}

/** 市场板块（按地区分组） */
export interface MarketRegion {
  /** 板块标识，例如 'us' / 'cn' / 'hk' / 'jp-kr' */
  id: string;
  /** 板块名称，例如 "美股" */
  name: string;
  /** 板块描述 */
  description: string;
  /** 主题色（Tailwind 颜色名，不带前缀） */
  accent: 'blue' | 'red' | 'amber' | 'emerald' | 'purple';
  /** 该板块下的指数列表 */
  indices: MacroIndex[];
}
