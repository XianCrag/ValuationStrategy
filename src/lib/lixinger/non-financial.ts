/**
 * Lixinger Non-Financial Data API
 * 理杏仁公司非财务数据API
 */

import { LixingerNonFinancialData, LixingerApiResponse, LixingerNonFinancialRequest } from './types';
import { getLixingerToken } from './utils';

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
  const token = getLixingerToken();

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

