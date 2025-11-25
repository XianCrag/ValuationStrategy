import { NextRequest, NextResponse } from 'next/server';
import { getNonFinancialData, getIndexFundamentalData, getDateRangeForYears, LixingerNonFinancialData, isStockCode } from '@/lib/lixinger';

export interface LixingerApiRequest {
  stockCodes: string[];
  years?: number;
  metricsList?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: LixingerApiRequest = await request.json();
    const { stockCodes, years = 10, metricsList = ['pe_ttm.y10.mcw.cvpos'] } = body;

    if (!stockCodes || stockCodes.length === 0) {
      return NextResponse.json(
        { error: 'stockCodes is required' },
        { status: 400 }
      );
    }

    const { startDate, endDate } = getDateRangeForYears(years);
    
    // 根据代码格式判断是股票还是指数
    const stockCodeList = stockCodes.filter(code => isStockCode(code));
    const indexCodeList = stockCodes.filter(code => !isStockCode(code));
    
    let data: LixingerNonFinancialData[] = [];
    
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

