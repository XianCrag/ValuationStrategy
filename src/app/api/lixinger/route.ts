import { NextRequest, NextResponse } from 'next/server';
import { 
  getNonFinancialData, 
  getIndexFundamentalData, 
  getNationalDebtData, 
  getFundData,
  getDateRangeForYears, 
  LixingerNonFinancialData, 
  LixingerInterestRatesData,
  LixingerFundData 
} from '@/lib/lixinger';
import { dailyCache, generateCacheKey } from '@/lib/cache';

export interface LixingerApiRequest {
  stockCodes?: string[];
  codeTypeMap?: Record<string, string>; // code 到 type 的映射，type 可以是 'stock', 'index' 或 'fund'
  nationalDebtCodes?: string[]; // 国债代码列表，如 ['tcm_y10']
  years?: number;
  metricsList?: string[];
}

/**
 * 分批获取股票、指数或基金数据
 * 当请求年份超过 MAX_YEARS_PER_REQUEST 时，自动分批请求并合并结果
 */
async function fetchDataInBatches(
  codes: string[],
  years: number,
  maxYearsPerRequest: number,
  startDate: string,
  endDate: string,
  metricsList: string[],
  type: 'stock' | 'index' | 'fund'
): Promise<(LixingerNonFinancialData | LixingerFundData)[]> {
  const allBatches: (LixingerNonFinancialData | LixingerFundData)[] = [];
  const totalBatches = Math.ceil(years / maxYearsPerRequest);
  const endDateObj = new Date(endDate);
  const startDateObj = new Date(startDate);
  
  for (let i = 0; i < totalBatches; i++) {
    // 计算当前批次的日期范围（从最新日期往前推）
    const batchEndDateObj = new Date(endDateObj);
    batchEndDateObj.setFullYear(batchEndDateObj.getFullYear() - i * maxYearsPerRequest);
    const batchEndDate = i === 0 ? endDate : batchEndDateObj.toISOString().split('T')[0];
    
    // 计算开始日期
    const batchStartDateObj = new Date(batchEndDateObj);
    batchStartDateObj.setFullYear(batchStartDateObj.getFullYear() - maxYearsPerRequest);
    // 对于最后一批，使用原始的startDate（确保不超出范围）
    const batchStartDate = batchStartDateObj < startDateObj 
      ? startDate 
      : batchStartDateObj.toISOString().split('T')[0];
    
    console.log(`${type}数据 - 获取第 ${i + 1}/${totalBatches} 批: ${batchStartDate} 到 ${batchEndDate}`);
    
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
      console.log(`  获取到 ${batchData.length} 条数据`);
      
      // 避免请求过快，在批次之间稍作延迟
      if (i < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`获取第 ${i + 1} 批${type}数据失败:`, error);
      // 继续获取其他批次，不中断整个流程
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
  
  console.log(`${type}数据分批获取完成，共 ${uniqueData.length} 条数据`);
  return uniqueData;
}

export async function POST(request: NextRequest) {
  try {
    const body: LixingerApiRequest = await request.json();
    const { stockCodes = [], codeTypeMap = {}, nationalDebtCodes = [], years = 10, metricsList = ['pe_ttm.y10.mcw.cvpos'] } = body;

    if (stockCodes.length === 0 && nationalDebtCodes.length === 0) {
      return NextResponse.json(
        { error: 'stockCodes or nationalDebtCodes is required' },
        { status: 400 }
      );
    }

    // 生成缓存键
    const cacheKey = generateCacheKey({
      stockCodes: [...stockCodes].sort(),
      codeTypeMap,
      nationalDebtCodes: [...nationalDebtCodes].sort(),
      years,
      metricsList: [...metricsList].sort(),
    });

    // 尝试从缓存获取数据
    const cachedResult = dailyCache.get(cacheKey);
    if (cachedResult) {
      console.log('✅ 缓存命中:', {
        stockCodes,
        nationalDebtCodes,
        years,
        cacheKeyPreview: cacheKey.substring(0, 100),
      });
      return NextResponse.json({
        ...cachedResult,
        fromCache: true, // 标记数据来自缓存
      });
    }

    console.log('❌ 缓存未命中，请求 Lixinger API:', {
      stockCodes,
      nationalDebtCodes,
      years,
    });

    const { startDate, endDate } = getDateRangeForYears(years);
    
    let data: (LixingerNonFinancialData | LixingerInterestRatesData | LixingerFundData)[] = [];
    
    // 如果年份超过10年，需要分批获取所有数据
    const MAX_YEARS_PER_REQUEST = 10;
    const needsBatching = years > MAX_YEARS_PER_REQUEST;
    
    // 获取股票、指数和基金数据
    if (stockCodes.length > 0) {
      // 根据 type 字段判断是股票、指数还是基金
      const stockCodeList = stockCodes.filter(code => {
        const type = codeTypeMap[code] || 'stock';
        return type === 'stock';
      });
      const indexCodeList = stockCodes.filter(code => {
        const type = codeTypeMap[code] || 'stock';
        return type === 'index';
      });
      const fundCodeList = stockCodes.filter(code => {
        const type = codeTypeMap[code] || 'stock';
        return type === 'fund';
      });
      
      // 获取股票数据
      if (stockCodeList.length > 0) {
        if (needsBatching) {
          console.log(`股票数据年份 ${years} 超过限制 ${MAX_YEARS_PER_REQUEST}，将分批获取`);
          const stockData = await fetchDataInBatches(
            stockCodeList,
            years,
            MAX_YEARS_PER_REQUEST,
            startDate,
            endDate,
            metricsList,
            'stock'
          );
          data = [...data, ...stockData];
        } else {
          const stockData = await getNonFinancialData(stockCodeList, startDate, endDate, metricsList);
          data = [...data, ...stockData];
        }
      }
      
      // 获取指数数据
      if (indexCodeList.length > 0) {
        if (needsBatching) {
          console.log(`指数数据年份 ${years} 超过限制 ${MAX_YEARS_PER_REQUEST}，将分批获取`);
          const indexData = await fetchDataInBatches(
            indexCodeList,
            years,
            MAX_YEARS_PER_REQUEST,
            startDate,
            endDate,
            metricsList,
            'index'
          );
          data = [...data, ...indexData];
        } else {
          const indexData = await getIndexFundamentalData(indexCodeList, startDate, endDate, metricsList);
          data = [...data, ...indexData];
        }
      }
      
      // 获取基金数据
      if (fundCodeList.length > 0) {
        if (needsBatching) {
          console.log(`基金数据年份 ${years} 超过限制 ${MAX_YEARS_PER_REQUEST}，将分批获取`);
          const fundData = await fetchDataInBatches(
            fundCodeList,
            years,
            MAX_YEARS_PER_REQUEST,
            startDate,
            endDate,
            [], // 基金API不需要metricsList
            'fund'
          );
          data = [...data, ...fundData];
        } else {
          const fundData = await getFundData(fundCodeList, startDate, endDate);
          data = [...data, ...fundData];
        }
      }
    }
    
    // 获取国债数据
    if (nationalDebtCodes.length > 0) {
      let nationalDebtData: LixingerInterestRatesData[] = [];
      
      // 如果年份超过10年，分批获取以避免API限制
      const MAX_YEARS_PER_REQUEST = 10;
      if (years > MAX_YEARS_PER_REQUEST) {
        console.log(`年份 ${years} 超过限制 ${MAX_YEARS_PER_REQUEST}，将分批获取数据`);
        const allBatches: LixingerInterestRatesData[] = [];
        const batchSize = MAX_YEARS_PER_REQUEST;
        const totalBatches = Math.ceil(years / batchSize);
        const endDateObj = new Date(endDate);
        const startDateObj = new Date(startDate);
        
        for (let i = 0; i < totalBatches; i++) {
          // 计算当前批次的日期范围
          // 从最新日期往前推，每批10年
          const batchEndDateObj = new Date(endDateObj);
          batchEndDateObj.setFullYear(batchEndDateObj.getFullYear() - i * batchSize);
          const batchEndDate = i === 0 ? endDate : batchEndDateObj.toISOString().split('T')[0];
          
          // 计算开始日期
          const batchStartDateObj = new Date(batchEndDateObj);
          batchStartDateObj.setFullYear(batchStartDateObj.getFullYear() - batchSize);
          // 对于最后一批，使用原始的startDate（确保不超出范围）
          const batchStartDate = batchStartDateObj < startDateObj 
            ? startDate 
            : batchStartDateObj.toISOString().split('T')[0];
          
          console.log(`获取第 ${i + 1}/${totalBatches} 批数据: ${batchStartDate} 到 ${batchEndDate}`);
          
          try {
            const batchData = await getNationalDebtData(batchStartDate, batchEndDate, 'cn', nationalDebtCodes);
            allBatches.push(...batchData);
            console.log(`  获取到 ${batchData.length} 条数据`);
            
            // 避免请求过快，在批次之间稍作延迟
            if (i < totalBatches - 1) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          } catch (error) {
            console.error(`获取第 ${i + 1} 批数据失败:`, error);
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
        
        nationalDebtData = Array.from(uniqueDataMap.values())
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        console.log(`分批获取完成，共 ${nationalDebtData.length} 条数据`);
      } else {
        // 年份不超过限制，直接获取
        nationalDebtData = await getNationalDebtData(startDate, endDate, 'cn', nationalDebtCodes);
      }
      
      // 将国债数据转换为统一格式，使用第一个国债代码作为标识
      const formattedNationalDebtData = nationalDebtData.map(item => ({
        ...item,
        stockCode: nationalDebtCodes[0], // 使用第一个代码作为标识
      }));
      data = [...data, ...formattedNationalDebtData];
    }

    // 映射 API 返回的字段名到前端使用的字段名
    // mc -> marketValue (市值) - 仅对股票/指数数据有效，基金数据没有mc字段
    // 国债数据转换为百分比（API返回的是小数，如0.025，转换为2.5）
    const mappedData = data.map(item => {
      const mapped: any = {
        ...item,
        marketValue: ('mc' in item) ? item.mc : undefined,
      };
      
      // 如果是国债数据，将所有tcm_开头的字段乘以100转换为百分比
      if ('tcm_y10' in item) {
        Object.keys(item).forEach(key => {
          if (key.startsWith('tcm_')) {
            const value = (item as any)[key];
            if (typeof value === 'number') {
              mapped[key] = value * 100;
            }
          }
        });
      }
      
      return mapped;
    });

    const result = {
      success: true,
      data: mappedData,
      dateRange: { startDate, endDate },
    };

    // 存入缓存（当天有效）
    dailyCache.set(cacheKey, result);
    console.log('💾 数据已缓存');

    return NextResponse.json(result);
  } catch (error) {
    console.error('Lixinger API route error:', error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
        ? error 
        : 'Failed to fetch data from Lixinger API';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        success: false 
      },
      { status: 500 }
    );
  }
}

