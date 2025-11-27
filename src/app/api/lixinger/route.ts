import { NextRequest, NextResponse } from 'next/server';
import { getNonFinancialData, getIndexFundamentalData, getNationalDebtData, getDateRangeForYears, LixingerNonFinancialData, LixingerInterestRatesData } from '@/lib/lixinger';

export interface LixingerApiRequest {
  stockCodes?: string[];
  codeTypeMap?: Record<string, string>; // code 到 type 的映射，type 可以是 'stock' 或 'index'
  nationalDebtCodes?: string[]; // 国债代码列表，如 ['tcm_y10']
  years?: number;
  metricsList?: string[];
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

    const { startDate, endDate } = getDateRangeForYears(years);
    
    let data: (LixingerNonFinancialData | LixingerInterestRatesData)[] = [];
    
    // 获取股票和指数数据
    if (stockCodes.length > 0) {
      // 根据 type 字段判断是股票还是指数
      const stockCodeList = stockCodes.filter(code => {
        const type = codeTypeMap[code] || 'stock';
        return type !== 'index';
      });
      const indexCodeList = stockCodes.filter(code => {
        const type = codeTypeMap[code] || 'stock';
        return type === 'index';
      });
      
      // 获取股票数据
      if (stockCodeList.length > 0) {
        const stockData = await getNonFinancialData(stockCodeList, startDate, endDate, metricsList);
        data = [...data, ...stockData];
      }
      
      // 获取指数数据
      if (indexCodeList.length > 0) {
        const indexData = await getIndexFundamentalData(indexCodeList, startDate, endDate, metricsList);
        data = [...data, ...indexData];
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
    // mc -> marketValue (市值) - 仅对股票数据有效
    const mappedData = data.map(item => ({
      ...item,
      marketValue: item.mc,
    }));

    return NextResponse.json({
      success: true,
      data: mappedData,
      dateRange: { startDate, endDate },
    });
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

