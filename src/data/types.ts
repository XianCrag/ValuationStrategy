/**
 * 按年份组织的数据文件类型定义
 * 适用于按月维度存储的金融数据（如国债、利率等）
 */

/**
 * 年月格式的日期字符串 (YYYY-MM)
 */
export type YearMonth = string;

/**
 * 年份字符串 (YYYY)
 */
export type Year = string;

/**
 * 数据项的基类接口
 * 所有按年份组织的数据项都应该包含 date 字段
 */
export interface BaseDataItem {
  /** 年月格式的日期 (YYYY-MM) */
  date: YearMonth;
  [key: string]: any; // 允许其他字段
}

/**
 * 按年份组织的数据结构
 * Key 为年份 (YYYY)，Value 为该年份的数据项数组
 */
export type DataByYear<T extends BaseDataItem = BaseDataItem> = Record<Year, T[]>;

/**
 * 日期范围
 */
export interface DateRange {
  /** 开始日期（年月格式 YYYY-MM） */
  start: YearMonth;
  /** 结束日期（年月格式 YYYY-MM） */
  end: YearMonth;
}

/**
 * 数据文件的元数据
 */
export interface DataFileMetadata {
  /** 数据获取时间 (ISO 8601 格式) */
  fetchedAt: string;
  /** 原始数据总记录数 */
  totalRecords: number;
  /** 过滤后的记录数 */
  filteredRecords: number;
  /** 日期范围 */
  dateRange: DateRange;
  /** 覆盖的年份列表 */
  years: Year[];
  /** 指标列表（可选） */
  metricsList?: string[];
}

/**
 * 按年份组织的数据文件结构
 * 
 * @template T - 数据项类型，必须继承 BaseDataItem
 * 
 * @example
 * ```typescript
 * // 国债数据示例
 * interface NationalDebtItem extends BaseDataItem {
 *   areaCode: string;
 *   tcm_y10: number;
 *   stockCode: string;
 * }
 * 
 * type NationalDebtDataFile = YearlyDataFile<NationalDebtItem>;
 * ```
 */
export interface YearlyDataFile<T extends BaseDataItem = BaseDataItem> {
  /** 按年份组织的数据 */
  data: DataByYear<T>;
  /** 数据文件的元数据 */
  metadata: DataFileMetadata;
}

/**
 * 国债数据项类型
 */
export interface NationalDebtItem extends BaseDataItem {
  /** 地区代码：'cn'（中国）、'hk'（香港）、'us'（美国） */
  areaCode: string;
  /** 10年期国债利率 */
  tcm_y10: number;
  /** 股票/债券代码 */
  stockCode: string;
}

/**
 * 国债数据文件类型
 */
export type NationalDebtDataFile = YearlyDataFile<NationalDebtItem>;

