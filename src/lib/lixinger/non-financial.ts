/**
 * Lixinger Non-Financial Data API
 * 理杏仁公司非财务数据 API（用于获取个股数据）
 */

import { LixingerNonFinancialData, LixingerApiResponse, LixingerNonFinancialRequest } from './types';
import { getLixingerToken } from './utils';

/**
 * 获取公司非财务数据（个股数据）
 * 
 * 支持的指标：sp（股票价格）, pe_ttm, pb, ps_ttm, mc（市值）, dyr（股息率）等
 * 注意：不支持 cp（收盘价/点位），个股使用 sp（股票价格）
 * 
 * @param stockCodes 股票代码列表，格式如 ['600036', '601988']
 * @param startDate 开始日期，格式 YYYY-MM-DD
 * @param endDate 结束日期，格式 YYYY-MM-DD
 * @param metricsList 指标列表，如 ['sp', 'pe_ttm', 'mc', 'dyr']
 * @returns 股票非财务数据数组
 */
export async function getNonFinancialData(
  stockCodes: string[],
  startDate: string,
  endDate: string,
  metricsList?: string[],
): Promise<LixingerNonFinancialData[]> {
  const token = getLixingerToken();

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

  console.log('📡 [Non-Financial API] 请求:', {
    url: baseUrl,
    stockCodes: stockCodes.slice(0, 3),
    stockCount: stockCodes.length,
    dateRange: `${startDate} ~ ${endDate}`,
    metrics: requestBody.metricsList || 'default',
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
    } catch (jsonError) {
      // JSON 解析失败，获取原始文本用于调试
      const errorText = await response.text().catch(() => 'Unable to read response');
      console.error('✗ [Non-Financial API] JSON 解析失败:', errorText.substring(0, 200));
      throw new Error(`Failed to parse API response: ${jsonError instanceof Error ? jsonError.message : 'Unknown parse error'}`);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${result.message || 'Unknown error'}`);
    }
    
    // Lixinger API 成功时返回 code: 1, message: "success"
    if (result.code !== 1) {
      const errorMsg = `API error (code: ${result.code}): ${result.message || 'Unknown error'}`;
      console.error('✗ [Non-Financial API]', errorMsg);
      throw new Error(errorMsg);
    }

    if (!result.data) {
      throw new Error('API returned no data');
    }

    console.log(`✓ [Non-Financial API] 成功: ${result.data.length} 条数据`);
    return result.data;
  } catch (error) {
    console.error('✗ [Non-Financial API] 请求失败:', error);
    throw error;
  }
}

