/**
 * API Types: AH股票价格和溢价
 */

// API 请求类型
export interface GetAHPriceRequest {
    // 股票代码（支持A股或H股代码）
    stockCode: string;
    // 可选：指定日期，格式 YYYY-MM-DD，默认为最新
    date?: string;
}

// 批量请求类型
export interface GetBatchAHPriceRequest {
    // 股票代码列表
    stockCodes: string[];
    // 可选：指定日期
    date?: string;
}

// 单个股票的AH价格信息
export interface AHPriceInfo {
    // A股信息
    aStock: {
        code: string;
        name: string;
        price: number;
        date: string;
    };
    // H股信息
    hStock: {
        code: string;
        name: string;
        price: number; // 港币价格
        priceInCNY: number; // 人民币价格
        date: string;
    };
    // 溢价信息
    premium: {
        rate: number; // 溢价率 (%)
        amount: number; // 溢价金额
        type: 'positive' | 'negative'; // 正溢价或负溢价
    };
    // 行业
    industry: string;
    // 数据更新时间
    updatedAt: string;
}

// API 响应类型
export interface GetAHPriceResponse {
    success: boolean;
    data?: AHPriceInfo;
    error?: string;
    message?: string;
}

// 批量响应类型
export interface GetBatchAHPriceResponse {
    success: boolean;
    data?: AHPriceInfo[];
    error?: string;
    message?: string;
    // 统计信息
    stats?: {
        total: number;
        success: number;
        failed: number;
    };
}

// 历史溢价数据点
export interface AHPremiumHistoryPoint {
  date: string;
  aPrice: number;
  hPriceInCNY: number;
  premium: number;
}

// 历史溢价请求
export interface GetAHPremiumHistoryRequest {
    stockCode: string;
    startDate: string;
    endDate: string;
}

// 历史溢价响应
export interface GetAHPremiumHistoryResponse {
    success: boolean;
    data?: {
        stockCode: string;
        name: string;
        history: AHPremiumHistoryPoint[];
        summary: {
            avgPremium: number;
            maxPremium: number;
            minPremium: number;
            currentPremium: number;
            premiumChange30d?: number;
        };
    };
    error?: string;
}

