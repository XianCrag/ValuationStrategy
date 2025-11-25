/**
 * Lixinger API Client
 * 理杏仁开放API客户端
 */

export interface LixingerNonFinancialData {
  date: string;
  mc?: number; // 市值 (Market Cap)
  pe_ttm?: number; // PE TTM
  [key: string]: any;
}

export interface LixingerApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

export interface LixingerNonFinancialRequest {
  stockCodes: string[];
  startDate: string;
  endDate: string;
  metricsList?: string[];
  token: string;
}

export interface LixingerIndexFundamentalRequest {
  stockCodes: string[];
  startDate: string;
  endDate: string;
  metricsList?: string[];
  token: string;
}

/**
 * 判断代码是否为股票代码（包含交易所后缀）
 */
export function isStockCode(code: string): boolean {
  return code.includes('.sh') || code.includes('.sz') || code.includes('.SH') || code.includes('.SZ');
}

/**
 * 获取公司非财务数据
 * @param stockCodes 股票代码列表，格式如 ['510300.sh']
 * @param startDate 开始日期，格式 YYYY-MM-DD
 * @param endDate 结束日期，格式 YYYY-MM-DD
 * @param metricsList 指标列表，如 ['mc', 'pe_ttm']
 */
export async function getNonFinancialData(
  stockCodes: string[],
  startDate: string,
  endDate: string,
  metricsList?: string[],
): Promise<LixingerNonFinancialData[]> {
  const token = process.env.LIXINGER_TOKEN;
  
  if (!token || token === 'your_lixinger_token_here') {
    throw new Error(
      'LIXINGER_TOKEN 未配置。请在项目根目录的 .env.local 文件中添加：\n' +
      'LIXINGER_TOKEN=your_actual_token\n\n' +
      '获取 Token: https://open.lixinger.com\n' +
      '配置后请重启开发服务器 (npm run dev)'
    );
  }

  // 构建 URL，将 token 作为查询参数
  const baseUrl = 'https://open.lixinger.com/api/cn/company/fundamental/non_financial';
  const url = new URL(baseUrl);
  
  const requestBody: LixingerNonFinancialRequest = {
    stockCodes,
    startDate,
    endDate,
    token,
  };

  if (metricsList && metricsList.length > 0) {
    requestBody.metricsList = metricsList;
  }

  console.log('Lixinger API request:', {
    url: url.toString(),
    stockCodes,
    startDate,
    endDate,
    metricsList: requestBody.metricsList,
  });

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    let result: LixingerApiResponse<LixingerNonFinancialData[]>;
    try {
      result = await response.json();
      console.log('Lixinger API parsed result:', { code: result.code, message: result.message, dataLength: Array.isArray(result.data) ? result.data.length : 'not array' });
    } catch (jsonError) {
      // 如果 JSON 解析失败，尝试获取原始文本用于调试
      const errorText = await response.text().catch(() => 'Unable to read response');
      console.error('JSON parse error:', jsonError, 'Response text:', errorText.substring(0, 500));
      throw new Error(`Failed to parse Lixinger API response: ${jsonError instanceof Error ? jsonError.message : 'Unknown parse error'}`);
    }

    if (!response.ok) {
      throw new Error(`Lixinger API HTTP error: ${response.status} - ${result.message || 'Unknown error'}`);
    }
    
    console.log('Lixinger API parsed result:', { code: result.code, message: result.message, hasData: !!result.data });
    
    // Lixinger API 成功时返回 code: 1, message: "success"
    if (result.code !== 1) {
      const errorMsg = `Lixinger API error (code: ${result.code}): ${result.message || 'Unknown error'}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    if (!result.data) {
      throw new Error('Lixinger API returned no data');
    }

    return result.data;
  } catch (error) {
    console.error('Error fetching Lixinger data:', error);
    throw error;
  }
}

/**
 * 获取指数基本面数据
 * @param stockCodes 指数代码列表，格式如 ['000300']
 * @param startDate 开始日期，格式 YYYY-MM-DD
 * @param endDate 结束日期，格式 YYYY-MM-DD
 * @param metricsList 指标列表，如 ['pe_ttm']
 */
export async function getIndexFundamentalData(
  stockCodes: string[],
  startDate: string,
  endDate: string,
  metricsList?: string[],
): Promise<LixingerNonFinancialData[]> {
  const token = process.env.LIXINGER_TOKEN;
  
  if (!token || token === 'your_lixinger_token_here') {
    throw new Error(
      'LIXINGER_TOKEN 未配置。请在项目根目录的 .env.local 文件中添加：\n' +
      'LIXINGER_TOKEN=your_actual_token\n\n' +
      '获取 Token: https://open.lixinger.com\n' +
      '配置后请重启开发服务器 (npm run dev)'
    );
  }

  const baseUrl = 'https://open.lixinger.com/api/cn/index/fundamental';
  const url = new URL(baseUrl);
  
  // 理杏仁指数 API 要求使用 stockCodes 参数（不是 indexCodes）
  const requestBody = {
    stockCodes, // API 要求使用 stockCodes
    startDate,
    endDate,
    token,
    ...(metricsList && metricsList.length > 0 && { metricsList }),
  };

  console.log('Lixinger Index API request:', {
    url: url.toString(),
    stockCodes,
    startDate,
    endDate,
    metricsList: requestBody.metricsList,
  });

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    let result: LixingerApiResponse<LixingerNonFinancialData[]>;
    try {
      result = await response.json();
      console.log('Lixinger Index API parsed result:', { code: result.code, message: result.message, dataLength: Array.isArray(result.data) ? result.data.length : 'not array' });
    } catch (jsonError) {
      const errorText = await response.text().catch(() => 'Unable to read response');
      console.error('JSON parse error:', jsonError, 'Response text:', errorText.substring(0, 500));
      throw new Error(`Failed to parse Lixinger Index API response: ${jsonError instanceof Error ? jsonError.message : 'Unknown parse error'}`);
    }

    if (!response.ok) {
      throw new Error(`Lixinger Index API HTTP error: ${response.status} - ${result.message || 'Unknown error'}`);
    }
    
    console.log('Lixinger Index API parsed result:', { code: result.code, message: result.message, hasData: !!result.data });
    
    if (result.code !== 1) {
      const errorMsg = `Lixinger Index API error (code: ${result.code}): ${result.message || 'Unknown error'}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    if (!result.data) {
      throw new Error('Lixinger Index API returned no data');
    }

    return result.data;
  } catch (error) {
    console.error('Error fetching Lixinger index data:', error);
    throw error;
  }
}

/**
 * 获取最近N年的日期范围
 */
export function getDateRangeForYears(years: number): { startDate: string; endDate: string } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - years);

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

