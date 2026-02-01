import { NextRequest, NextResponse } from 'next/server';
import {
  getNonFinancialData,
  getIndexFundamentalData,
  getNationalDebtData,
  getFundData,
  getDateRangeForYears,
  LixingerNonFinancialData,
  LixingerInterestRatesData,
  LixingerFundData,
  CandlestickData,
  HKCandlestickData
} from '@/lib/lixinger';
import { dailyCache, generateCacheKey, generateSingleCodeCacheKey } from '@/lib/cache';
import {
  INDEX_FULL_METRICS,
  FUND_NET_VALUE_METRICS,
  NATIONAL_DEBT_METRICS,
  INDIVIDUAL_STOCK_METRICS,
} from '@/constants/metrics';
import { StockType } from '@/types/stock';

/**
 * 合并股票数据和K线数据
 * 将K线数据中的收盘价（close）添加到股票数据中作为 sp 字段
 * 
 * @param stockData 股票基础数据
 * @param candlestickData K线数据 Map
 * @returns 合并后的数据
 */
function mergeStockDataWithCandlestick(
  stockData: LixingerNonFinancialData[],
  candlestickData: Map<string, CandlestickData[]>
): LixingerNonFinancialData[] {
  return stockData.map(item => {
    const stockCode = item.stockCode;
    const itemDate = item.date.split('T')[0]; // 提取日期部分

    // 获取该股票的K线数据
    const candlesticks = candlestickData.get(stockCode) || [];

    // 查找匹配日期的K线数据
    const matchingCandlestick = candlesticks.find(c => {
      const candleDate = c.date.split('T')[0];
      return candleDate === itemDate;
    });

    // 如果找到匹配的K线数据，使用其收盘价作为 sp
    if (matchingCandlestick) {
      return {
        ...item,
        sp: matchingCandlestick.close, // 使用前复权收盘价
      };
    }

    return item;
  });
}

/**
 * 并发控制函数 - 限制同时并发数
 * @param tasks 任务数组
 * @param concurrency 最大并发数，默认5
 * @returns 所有任务的结果数组
 */
async function runWithConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number = 5
): Promise<T[]> {
  const results: T[] = [];
  let currentIndex = 0;

  // 创建 worker 函数
  const worker = async () => {
    while (currentIndex < tasks.length) {
      const index = currentIndex++;
      const task = tasks[index];
      results[index] = await task();
    }
  };

  // 创建并发 worker 池
  const workers = Array(Math.min(concurrency, tasks.length))
    .fill(null)
    .map(() => worker());

  await Promise.all(workers);
  return results;
}

/**
 * 格式化日期为 YYYY-MM-DD 格式（使用本地时区，避免 UTC 转换问题）
 */
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 计算分批请求的日期范围
 * @param batchIndex 当前批次索引（从0开始）
 * @param totalBatches 总批次数
 * @param batchSize 每批次的年数
 * @param startDateObj 起始日期对象
 * @param endDateObj 结束日期对象
 * @param originalStartDate 原始起始日期字符串
 * @param originalEndDate 原始结束日期字符串
 * @returns 当前批次的起始和结束日期
 */
function calculateBatchDateRange(
  batchIndex: number,
  totalBatches: number,
  batchSize: number,
  startDateObj: Date,
  endDateObj: Date,
  originalStartDate: string,
  originalEndDate: string
): { batchStartDate: string; batchEndDate: string } {
  // 计算当前批次的结束日期（从最新日期往前推）
  const batchEndDateObj = new Date(endDateObj);
  batchEndDateObj.setFullYear(batchEndDateObj.getFullYear() - batchIndex * batchSize);
  const batchEndDate = batchIndex === 0 ? originalEndDate : formatLocalDate(batchEndDateObj);

  // 计算当前批次的开始日期
  const batchStartDateObj = new Date(batchEndDateObj);
  batchStartDateObj.setFullYear(batchStartDateObj.getFullYear() - batchSize);

  // 对于最后一批，使用原始的 startDate（确保不超出范围）
  const batchStartDate = batchStartDateObj < startDateObj
    ? originalStartDate
    : formatLocalDate(batchStartDateObj);

  return { batchStartDate, batchEndDate };
}

/**
 * 根据代码类型自动选择对应的指标列表
 * 
 * - stock: 个股指标（股票价格、PE、市值、股息率）
 * - index: 指数指标（市值加权PE、点位、市值）
 * - fund: 基金指标（累计净值）
 * - hkstock: 港股指标（由K线数据提供）
 */
function getDefaultMetricsList(type: StockType): string[] {
  switch (type) {
    case StockType.STOCK:
      // 股票需要完整数据：股票价格 + PE + 市值 + 股息率
      return [...INDIVIDUAL_STOCK_METRICS];
    case StockType.INDEX:
      // 指数需要完整数据：PE + 价格 + 市值
      return [...INDEX_FULL_METRICS];
    case StockType.FUND:
      // 基金净值数据：累计净值（复权）
      return [...FUND_NET_VALUE_METRICS];
    case StockType.HKSTOCK:
      // 港股数据由K线API提供，不需要额外指标
      return [];
    default:
      return [];
  }
}

export interface LixingerApiRequest {
  /** 股票/指数/基金代码列表（如 ['600036', '000300', '510300']） */
  stockCodes?: string[];
  /** 代码类型映射表，指定每个代码的类型（stock/index/fund） */
  codeTypeMap?: Record<string, string>;
  /** 国债指标代码列表（实际上是 metricsList，如 ['tcm_y10']） */
  nationalDebtCodes?: string[];
  /** 查询年限（从今天往前推 N 年） */
  years?: number;
  /** @deprecated 已废弃，现在由 API 根据 codeTypeMap 自动选择指标 */
  metricsList?: string[];
}

/**
 * 使用单个 code 级别缓存获取数据
 * 对每个 code 单独检查缓存并获取，提高缓存复用率
 * 
 * @param codes 代码列表
 * @param years 查询年限
 * @param type 数据类型
 * @param startDate 起始日期
 * @param endDate 结束日期
 * @param needsBatching 是否需要分批
 * @param maxYearsPerRequest 每批最大年数
 * @returns 数据和缓存统计
 */
async function fetchWithSingleCodeCache(
  codes: string[],
  years: number,
  type: StockType,
  startDate: string,
  endDate: string,
  needsBatching: boolean,
  maxYearsPerRequest: number
): Promise<{
  data: (LixingerNonFinancialData | LixingerFundData)[];
  cacheHits: number;
  cacheMisses: number;
}> {
  const allData: (LixingerNonFinancialData | LixingerFundData)[] = [];
  let cacheHits = 0;
  let cacheMisses = 0;

  console.log(`🔍 检查 ${codes.length} 个 ${type} 的缓存 (${years}年)`);

  // 首先检查所有缓存，分离命中和未命中的代码
  const cachedCodes: string[] = [];
  const uncachedCodes: string[] = [];

  for (const code of codes) {
    const cacheKey = generateSingleCodeCacheKey(code, years, type);
    const cachedData = dailyCache.get<(LixingerNonFinancialData | LixingerFundData)[]>(cacheKey);

    if (cachedData) {
      console.log(`  ✅ 缓存命中: ${code} (${cachedData.length} 条)`);
      allData.push(...cachedData);
      cacheHits++;
      cachedCodes.push(code);
    } else {
      uncachedCodes.push(code);
    }
  }

  // 如果有未命中缓存的代码，使用并发控制获取数据
  if (uncachedCodes.length > 0) {
    console.log(`  📡 使用并发控制(最多5个)获取 ${uncachedCodes.length} 个代码的数据`);

    // 创建任务数组
    const tasks = uncachedCodes.map(code => async () => {
      console.log(`  ❌ 缓存未命中，请求 API: ${code}`);

      // 获取数据
      let codeData: (LixingerNonFinancialData | LixingerFundData)[];

      if (needsBatching) {
        codeData = await fetchDataInBatches(
          [code],
          years,
          maxYearsPerRequest,
          startDate,
          endDate,
          type
        );
      } else {
        const metricsList = getDefaultMetricsList(type);

        if (type === StockType.FUND) {
          codeData = await getFundData([code], startDate, endDate);
        } else if (type === StockType.STOCK) {
          codeData = await getNonFinancialData([code], startDate, endDate, metricsList);
        } else {
          codeData = await getIndexFundamentalData([code], startDate, endDate, metricsList);
        }
      }

      // 缓存单个 code 的数据
      const cacheKey = generateSingleCodeCacheKey(code, years, type);
      dailyCache.set(cacheKey, codeData);
      console.log(`  💾 已缓存: ${code} (${codeData.length} 条)`);

      return codeData;
    });

    // 使用并发控制执行任务（最多5个并发）
    const results = await runWithConcurrencyLimit(tasks, 5);

    // 合并结果
    results.forEach(codeData => {
      allData.push(...codeData);
    });

    cacheMisses = uncachedCodes.length;
  }

  return { data: allData, cacheHits, cacheMisses };
}

/**
 * 使用单个 code 级别缓存获取K线数据
 * 
 * @param codes 股票代码列表
 * @param years 查询年限
 * @param startDate 起始日期
 * @param endDate 结束日期
 * @returns K线数据 Map 和缓存统计
 */
async function fetchCandlestickWithCache(
  codes: string[],
  years: number,
  startDate: string,
  endDate: string
): Promise<{
  data: Map<string, CandlestickData[]>;
  cacheHits: number;
  cacheMisses: number;
}> {
  const candlestickMap = new Map<string, CandlestickData[]>();
  let cacheHits = 0;
  let cacheMisses = 0;

  console.log(`🔍 检查 ${codes.length} 个股票的K线数据缓存 (${years}年)`);

  // 首先检查所有缓存，分离命中和未命中的代码
  const uncachedCodes: string[] = [];

  for (const code of codes) {
    const cacheKey = generateSingleCodeCacheKey(code, years, 'candlestick' as any);
    const cachedData = dailyCache.get<CandlestickData[]>(cacheKey);

    if (cachedData) {
      console.log(`  ✅ K线缓存命中: ${code} (${cachedData.length} 条)`);
      candlestickMap.set(code, cachedData);
      cacheHits++;
    } else {
      uncachedCodes.push(code);
    }
  }

  // 如果有未命中缓存的代码，使用并发控制获取K线数据
  if (uncachedCodes.length > 0) {
    console.log(`  📡 使用并发控制(最多5个)获取 ${uncachedCodes.length} 个股票的K线数据`);

    // 创建任务数组
    const tasks = uncachedCodes.map(code => async () => {
      console.log(`  ❌ K线缓存未命中，请求 API: ${code}`);

      try {
        const { getCandlestickData } = await import('@/lib/lixinger/candlestick');
        const data = await getCandlestickData(code, startDate, endDate);

        // 缓存单个 code 的K线数据
        const cacheKey = generateSingleCodeCacheKey(code, years, 'candlestick' as any);
        dailyCache.set(cacheKey, data);
        console.log(`  💾 已缓存K线数据: ${code} (${data.length} 条)`);

        return { code, data, success: true };
      } catch (error) {
        console.error(`  ✗ 获取K线数据失败: ${code}`, error);
        return { code, data: [] as CandlestickData[], success: false };
      }
    });

    // 使用并发控制执行任务（最多5个并发）
    const results = await runWithConcurrencyLimit(tasks, 5);

    // 处理结果
    results.forEach(result => {
      candlestickMap.set(result.code, result.data);
      if (result.success) {
        cacheMisses++;
      }
    });
  }

  return { data: candlestickMap, cacheHits, cacheMisses };
}

/**
 * 使用单个 code 级别缓存获取港股K线数据
 * 
 * @param codes 港股代码列表
 * @param years 查询年限
 * @param startDate 起始日期
 * @param endDate 结束日期
 * @returns 港股K线数据 Map 和缓存统计
 */
async function fetchHKCandlestickWithCache(
  codes: string[],
  years: number,
  startDate: string,
  endDate: string
): Promise<{
  data: Map<string, HKCandlestickData[]>;
  cacheHits: number;
  cacheMisses: number;
}> {
  const candlestickMap = new Map<string, HKCandlestickData[]>();
  let cacheHits = 0;
  let cacheMisses = 0;

  console.log(`🔍 检查 ${codes.length} 个港股的K线数据缓存 (${years}年)`);

  // 首先检查所有缓存，分离命中和未命中的代码
  const uncachedCodes: string[] = [];

  for (const code of codes) {
    const cacheKey = generateSingleCodeCacheKey(code, years, 'hk-candlestick' as any);
    const cachedData = dailyCache.get<HKCandlestickData[]>(cacheKey);

    if (cachedData) {
      console.log(`  ✅ 港股K线缓存命中: ${code} (${cachedData.length} 条)`);
      candlestickMap.set(code, cachedData);
      cacheHits++;
    } else {
      uncachedCodes.push(code);
    }
  }

  // 如果有未命中缓存的代码，使用并发控制获取港股K线数据
  if (uncachedCodes.length > 0) {
    console.log(`  📡 使用并发控制(最多5个)获取 ${uncachedCodes.length} 个港股的K线数据`);

    // 创建任务数组
    const tasks = uncachedCodes.map(code => async () => {
      console.log(`  ❌ 港股K线缓存未命中，请求 API: ${code}`);

      try {
        const { getHKCandlestickData } = await import('@/lib/lixinger/hk-candlestick');
        const data = await getHKCandlestickData(code, startDate, endDate);

        // 缓存单个 code 的港股K线数据
        const cacheKey = generateSingleCodeCacheKey(code, years, 'hk-candlestick' as any);
        dailyCache.set(cacheKey, data);
        console.log(`  💾 已缓存港股K线数据: ${code} (${data.length} 条)`);

        return { code, data, success: true };
      } catch (error) {
        console.error(`  ✗ 获取港股K线数据失败: ${code}`, error);
        return { code, data: [] as HKCandlestickData[], success: false };
      }
    });

    // 使用并发控制执行任务（最多5个并发）
    const results = await runWithConcurrencyLimit(tasks, 5);

    // 处理结果
    results.forEach(result => {
      candlestickMap.set(result.code, result.data);
      if (result.success) {
        cacheMisses++;
      }
    });
  }

  return { data: candlestickMap, cacheHits, cacheMisses };
}

/**
 * 分批获取国债数据
 * 
 * @param codes 国债指标代码列表
 * @param years 总年数
 * @param maxYearsPerRequest 每批最大年数
 * @param startDate 起始日期
 * @param endDate 结束日期
 * @returns 合并后的国债数据数组
 */
async function fetchDebtDataInBatches(
  codes: string[],
  years: number,
  maxYearsPerRequest: number,
  startDate: string,
  endDate: string
): Promise<LixingerInterestRatesData[]> {
  const allBatches: LixingerInterestRatesData[] = [];
  const totalBatches = Math.ceil(years / maxYearsPerRequest);
  const endDateObj = new Date(endDate);
  const startDateObj = new Date(startDate);

  for (let i = 0; i < totalBatches; i++) {
    const { batchStartDate, batchEndDate } = calculateBatchDateRange(
      i, totalBatches, maxYearsPerRequest, startDateObj, endDateObj, startDate, endDate
    );

    console.log(`[批次 ${i + 1}/${totalBatches}] 国债数据: ${batchStartDate} ~ ${batchEndDate}`);

    try {
      const batchData = await getNationalDebtData(batchStartDate, batchEndDate, 'cn', codes);
      allBatches.push(...batchData);
      console.log(`  ✓ 获取成功: ${batchData.length} 条数据`);

      // 避免请求过快，在批次之间稍作延迟
      if (i < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`  ✗ 获取失败:`, error);
      // 继续获取其他批次，不中断整个流程
    }
  }

  // 去重并排序（按日期去重，保留最新的）
  const uniqueDataMap = new Map<string, LixingerInterestRatesData>();
  allBatches.forEach(item => {
    const dateKey = item.date.split('T')[0]; // 使用日期作为key去重
    if (!uniqueDataMap.has(dateKey) || new Date(item.date) > new Date(uniqueDataMap.get(dateKey)!.date)) {
      uniqueDataMap.set(dateKey, item);
    }
  });

  const uniqueData = Array.from(uniqueDataMap.values())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  console.log(`✅ 国债数据分批获取完成: 共 ${uniqueData.length} 条`);

  // 格式化国债数据，添加 stockCode 字段
  return uniqueData.map(item => ({
    ...item,
    stockCode: codes[0],
  }));
}

/**
 * 分批获取股票、指数或基金数据
 * 
 * 当请求年份超过 MAX_YEARS_PER_REQUEST（10年）时，自动分批请求并合并结果。
 * 对于多个股票，会对每个股票单独并发请求，避免 API 限制。
 * 
 * @param codes 代码列表
 * @param years 总年数
 * @param maxYearsPerRequest 每批最大年数
 * @param startDate 起始日期
 * @param endDate 结束日期
 * @param type 数据类型
 * @returns 合并后的数据数组
 */
async function fetchDataInBatches(
  codes: string[],
  years: number,
  maxYearsPerRequest: number,
  startDate: string,
  endDate: string,
  type: StockType
): Promise<(LixingerNonFinancialData | LixingerFundData)[]> {
  const allBatches: (LixingerNonFinancialData | LixingerFundData)[] = [];
  const totalBatches = Math.ceil(years / maxYearsPerRequest);
  const endDateObj = new Date(endDate);
  const startDateObj = new Date(startDate);

  // 根据类型自动获取默认指标配置
  const metricsList = getDefaultMetricsList(type);

  // 对于多个股票，采用并发策略分别请求，提高效率
  if (codes.length > 1 && type === StockType.STOCK) {
    console.log(`🔄 并发请求 ${codes.length} 个股票，每个分 ${totalBatches} 批`);

    const codePromises = codes.map(async (code) => {
      const codeBatches: (LixingerNonFinancialData | LixingerFundData)[] = [];

      for (let i = 0; i < totalBatches; i++) {
        const { batchStartDate, batchEndDate } = calculateBatchDateRange(
          i, totalBatches, maxYearsPerRequest, startDateObj, endDateObj, startDate, endDate
        );

        console.log(`    [批次 ${i + 1}/${totalBatches}] 股票 ${code}: ${batchStartDate} ~ ${batchEndDate}`);

        try {
          const batchData = await getNonFinancialData([code], batchStartDate, batchEndDate, metricsList);
          codeBatches.push(...batchData);
          console.log(`      ✓ 获取成功: ${batchData.length} 条数据`);

          // 避免请求过快，在批次之间稍作延迟
          if (i < totalBatches - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (error) {
          console.error(`      ✗ 获取失败:`, error);
        }
      }

      return codeBatches;
    });

    const allCodeBatches = await Promise.all(codePromises);
    allCodeBatches.forEach(batches => {
      allBatches.push(...batches);
    });
  } else {
    // 单个代码或非股票类型
    for (let i = 0; i < totalBatches; i++) {
      const { batchStartDate, batchEndDate } = calculateBatchDateRange(
        i, totalBatches, maxYearsPerRequest, startDateObj, endDateObj, startDate, endDate
      );

      console.log(`[批次 ${i + 1}/${totalBatches}] ${type} 数据: ${batchStartDate} ~ ${batchEndDate}`);

      try {
        let batchData: (LixingerNonFinancialData | LixingerFundData)[];

        if (type === 'fund') {
          batchData = await getFundData(codes, batchStartDate, batchEndDate);
        } else if (type === 'stock') {
          batchData = await getNonFinancialData(codes, batchStartDate, batchEndDate, metricsList);
        } else {
          batchData = await getIndexFundamentalData(codes, batchStartDate, batchEndDate, metricsList);
        }

        allBatches.push(...batchData);
        console.log(`  ✓ 获取成功: ${batchData.length} 条数据`);

        // 避免请求过快，在批次之间稍作延迟
        if (i < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`  ✗ 获取失败:`, error);
        // 继续获取其他批次，不中断整个流程
      }
    }
  }

  // 去重并排序（按日期+股票代码去重，保留最新的）
  const uniqueDataMap = new Map<string, LixingerNonFinancialData | LixingerFundData>();
  allBatches.forEach(item => {
    const dateKey = `${item.date.split('T')[0]}-${item.stockCode}`; // 使用日期+代码作为key去重
    if (!uniqueDataMap.has(dateKey) || new Date(item.date) > new Date(uniqueDataMap.get(dateKey)!.date)) {
      uniqueDataMap.set(dateKey, item);
    }
  });

  const uniqueData = Array.from(uniqueDataMap.values())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  console.log(`✅ 分批获取完成 [${type}]: 共 ${uniqueData.length} 条数据`);
  return uniqueData;
}

export async function POST(request: NextRequest) {
  try {
    const body: LixingerApiRequest = await request.json();
    const { stockCodes = [], codeTypeMap = {}, nationalDebtCodes = [], years = 10 } = body;

    if (stockCodes.length === 0 && nationalDebtCodes.length === 0) {
      return NextResponse.json(
        { error: 'stockCodes or nationalDebtCodes is required' },
        { status: 400 }
      );
    }

    console.log('📡 API 请求:', {
      stockCodes,
      nationalDebtCodes,
      years,
    });

    const { startDate, endDate } = getDateRangeForYears(years);

    let data: (LixingerNonFinancialData | LixingerInterestRatesData | LixingerFundData)[] = [];
    let cacheHits = 0;
    let cacheMisses = 0;

    // 如果年份超过10年，需要分批获取所有数据
    const MAX_YEARS_PER_REQUEST = 10;
    const needsBatching = years > MAX_YEARS_PER_REQUEST;

    // 获取股票、指数和基金数据
    if (stockCodes.length > 0) {
      // 根据 type 字段判断是股票、指数、基金还是港股
      const stockCodeList = stockCodes.filter(code => {
        const type = codeTypeMap[code] || StockType.STOCK;
        return type === StockType.STOCK;
      });
      const indexCodeList = stockCodes.filter(code => {
        const type = codeTypeMap[code] || StockType.STOCK;
        return type === StockType.INDEX;
      });
      const fundCodeList = stockCodes.filter(code => {
        const type = codeTypeMap[code] || StockType.STOCK;
        return type === StockType.FUND;
      });
      const hkStockCodeList = stockCodes.filter(code => {
        const type = codeTypeMap[code] || StockType.STOCK;
        return type === StockType.HKSTOCK;
      });

      // 获取股票数据（单个 code 缓存）
      if (stockCodeList.length > 0) {
        const stockResults = await fetchWithSingleCodeCache(
          stockCodeList,
          years,
          StockType.STOCK,
          startDate,
          endDate,
          needsBatching,
          MAX_YEARS_PER_REQUEST
        );

        // 获取股票的K线数据（前复权价格）- 使用缓存
        console.log(`📈 获取股票K线数据（前复权）: ${stockCodeList.join(',')}`);
        const candlestickResults = await fetchCandlestickWithCache(
          stockCodeList,
          years,
          startDate,
          endDate
        );
        console.log(`  ✓ K线数据获取成功: ${Array.from(candlestickResults.data.values()).reduce((sum, arr) => sum + arr.length, 0)} 条`);

        // 合并股票数据和K线数据
        const mergedStockData = mergeStockDataWithCandlestick(
          stockResults.data as LixingerNonFinancialData[],
          candlestickResults.data
        );

        data = [...data, ...mergedStockData];
        cacheHits += stockResults.cacheHits + candlestickResults.cacheHits;
        cacheMisses += stockResults.cacheMisses + candlestickResults.cacheMisses;
      }

      // 获取指数数据（单个 code 缓存）
      if (indexCodeList.length > 0) {
        const indexResults = await fetchWithSingleCodeCache(
          indexCodeList,
          years,
          StockType.INDEX,
          startDate,
          endDate,
          needsBatching,
          MAX_YEARS_PER_REQUEST
        );
        data = [...data, ...indexResults.data];
        cacheHits += indexResults.cacheHits;
        cacheMisses += indexResults.cacheMisses;
      }

      // 获取基金数据（单个 code 缓存）
      if (fundCodeList.length > 0) {
        const fundResults = await fetchWithSingleCodeCache(
          fundCodeList,
          years,
          StockType.FUND,
          startDate,
          endDate,
          needsBatching,
          MAX_YEARS_PER_REQUEST
        );
        data = [...data, ...fundResults.data];
        cacheHits += fundResults.cacheHits;
        cacheMisses += fundResults.cacheMisses;
      }

      // 获取港股数据（K线数据）
      if (hkStockCodeList.length > 0) {
        console.log(`🇭🇰 获取港股K线数据: ${hkStockCodeList.join(',')}`);
        const hkCandlestickResults = await fetchHKCandlestickWithCache(
          hkStockCodeList,
          years,
          startDate,
          endDate
        );
        console.log(`  ✓ 港股K线数据获取成功: ${Array.from(hkCandlestickResults.data.values()).reduce((sum, arr) => sum + arr.length, 0)} 条`);

        // 将港股K线数据转换为统一格式
        const hkData: LixingerNonFinancialData[] = [];
        hkCandlestickResults.data.forEach((candlesticks, code) => {
          candlesticks.forEach(candle => {
            hkData.push({
              date: candle.date,
              stockCode: code,
              sp: candle.close, // 港股收盘价
              // 其他字段可以根据需要添加
            } as LixingerNonFinancialData);
          });
        });

        data = [...data, ...hkData];
        cacheHits += hkCandlestickResults.cacheHits;
        cacheMisses += hkCandlestickResults.cacheMisses;
      }
    }

    // 获取国债数据（整体缓存，因为通常一起使用）
    if (nationalDebtCodes.length > 0) {
      const debtCacheKey = generateCacheKey({
        nationalDebtCodes: [...nationalDebtCodes].sort(),
        years,
        type: 'debt',
      });

      const cachedDebtData = dailyCache.get<LixingerInterestRatesData[]>(debtCacheKey);
      if (cachedDebtData) {
        console.log(`  ✅ 国债数据缓存命中: ${nationalDebtCodes.join(',')}`);
        data = [...data, ...cachedDebtData];
        cacheHits++;
      } else {
        console.log(`  ❌ 国债数据缓存未命中，请求 API: ${nationalDebtCodes.join(',')}`);
        if (needsBatching) {
          console.log(`📦 国债数据需要分批获取 (${years}年 > ${MAX_YEARS_PER_REQUEST}年)`);
          const debtData = await fetchDebtDataInBatches(
            nationalDebtCodes,
            years,
            MAX_YEARS_PER_REQUEST,
            startDate,
            endDate
          );
          data = [...data, ...debtData];
          dailyCache.set(debtCacheKey, debtData);
        } else {
          const debtData = await getNationalDebtData(startDate, endDate, 'cn', nationalDebtCodes);
          // 格式化国债数据，添加 stockCode 字段
          const formattedDebtData = debtData.map(item => ({
            ...item,
            stockCode: nationalDebtCodes[0],
          }));
          data = [...data, ...formattedDebtData];
          dailyCache.set(debtCacheKey, formattedDebtData);
        }
        cacheMisses++;
      }
    }

    // 日志输出缓存统计
    const totalRequests = cacheHits + cacheMisses;
    const hitRate = totalRequests > 0 ? ((cacheHits / totalRequests) * 100).toFixed(1) : '0.0';
    console.log(`📊 缓存统计: 命中 ${cacheHits}/${totalRequests} (${hitRate}%)`);

    return NextResponse.json({
      success: true,
      data: data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      dateRange: {
        startDate,
        endDate,
      },
      meta: {
        count: data.length,
        years,
        cache: {
          hits: cacheHits,
          misses: cacheMisses,
          hitRate: `${hitRate}%`,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch data',
        data: [],
        dateRange: { startDate: '', endDate: '' },
      },
      { status: 500 }
    );
  }
}


