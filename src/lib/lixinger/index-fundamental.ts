/**
 * Lixinger Index Fundamental Data API
 * 理杏仁指数基本面数据API
 */

import { LixingerNonFinancialData, LixingerApiResponse } from './types';
import { getLixingerToken } from './utils';

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
  const token = getLixingerToken();

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

