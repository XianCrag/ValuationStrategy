/**
 * API Route: 获取AH股票价格和溢价
 * GET /api/ah-price?stockCode=601988
 * POST /api/ah-price (批量查询)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    GetAHPriceResponse,
    GetBatchAHPriceResponse,
} from './types';
import { findByACode, findByHCode } from '@/constants/ah-stocks';
import { fetchAHPriceData, fetchBatchAHPriceData } from './service';

/**
 * GET: 获取单个股票的AH价格和溢价
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const stockCode = searchParams.get('stockCode');
        const date = searchParams.get('date') || undefined;

        // 参数验证
        if (!stockCode) {
            return NextResponse.json<GetAHPriceResponse>(
                {
                    success: false,
                    error: '缺少必要参数: stockCode',
                },
                { status: 400 }
            );
        }

        // 验证股票代码是否在AH股票列表中
        const ahStock = findByACode(stockCode) || findByHCode(stockCode);
        if (!ahStock) {
            return NextResponse.json<GetAHPriceResponse>(
                {
                    success: false,
                    error: `股票代码 ${stockCode} 不是AH股，或未在系统中`,
                },
                { status: 404 }
            );
        }

        console.log(`📊 [AH Price API] 获取股票价格: ${stockCode}`, date ? `日期: ${date}` : '最新');

        // 获取AH价格数据
        const priceInfo = await fetchAHPriceData(ahStock, date);

        return NextResponse.json<GetAHPriceResponse>({
            success: true,
            data: priceInfo,
            message: '获取成功',
        });

    } catch (error) {
        console.error('❌ [AH Price API] 错误:', error);
        return NextResponse.json<GetAHPriceResponse>(
            {
                success: false,
                error: error instanceof Error ? error.message : '获取AH价格失败',
            },
            { status: 500 }
        );
    }
}

/**
 * POST: 批量获取多个股票的AH价格和溢价
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { stockCodes, date } = body;

        // 参数验证
        if (!stockCodes || !Array.isArray(stockCodes) || stockCodes.length === 0) {
            return NextResponse.json<GetBatchAHPriceResponse>(
                {
                    success: false,
                    error: '缺少必要参数: stockCodes (数组)',
                },
                { status: 400 }
            );
        }

        if (stockCodes.length > 100) {
            return NextResponse.json<GetBatchAHPriceResponse>(
                {
                    success: false,
                    error: '一次最多查询100个股票',
                },
                { status: 400 }
            );
        }

        console.log(`📊 [AH Price API] 批量获取: ${stockCodes.length} 个股票`);

        // 批量获取数据
        const result = await fetchBatchAHPriceData(stockCodes, date);

        return NextResponse.json<GetBatchAHPriceResponse>({
            success: true,
            data: result.data,
            stats: result.stats,
            message: `成功获取 ${result.stats.success}/${result.stats.total} 个股票数据`,
        });

    } catch (error) {
        console.error('❌ [AH Price API] 批量查询错误:', error);
        return NextResponse.json<GetBatchAHPriceResponse>(
            {
                success: false,
                error: error instanceof Error ? error.message : '批量获取AH价格失败',
            },
            { status: 500 }
        );
    }
}

