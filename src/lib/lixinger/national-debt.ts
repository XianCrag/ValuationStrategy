/**
 * Lixinger National Debt API
 * 理杏仁国债数据API
 */

import { LixingerInterestRatesData, LixingerApiResponse } from './types';
import { getLixingerToken } from './utils';

/**
 * 获取国债数据
 * @param startDate 开始日期，格式 YYYY-MM-DD
 * @param endDate 结束日期，格式 YYYY-MM-DD
 * @param areaCode 地区代码：'cn'（中国）、'hk'（香港）、'us'（美国）
 * @param metricsList 指标列表，如 ['tcm_y10']（中国10年期国债）
 */
export async function getNationalDebtData(
  startDate: string,
  endDate: string,
  areaCode: string = 'cn',
  metricsList?: string[],
): Promise<LixingerInterestRatesData[]> {
  const token = getLixingerToken();

  const baseUrl = 'https://open.lixinger.com/api/macro/national-debt';
  const url = new URL(baseUrl);
  
  const requestBody = {
    startDate,
    endDate,
    areaCode,
    token,
    ...(metricsList && metricsList.length > 0 && { metricsList }),
  };

  console.log('Lixinger National Debt API request:', {
    url: url.toString(),
    startDate,
    endDate,
    areaCode,
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

    let result: LixingerApiResponse<LixingerInterestRatesData[]>;
    try {
      result = await response.json();
      console.log('Lixinger National Debt API parsed result:', { code: result.code, message: result.message, dataLength: Array.isArray(result.data) ? result.data.length : 'not array' });
    } catch (jsonError) {
      const errorText = await response.text().catch(() => 'Unable to read response');
      console.error('JSON parse error:', jsonError, 'Response text:', errorText.substring(0, 500));
      throw new Error(`Failed to parse Lixinger National Debt API response: ${jsonError instanceof Error ? jsonError.message : 'Unknown parse error'}`);
    }

    if (!response.ok) {
      throw new Error(`Lixinger National Debt API HTTP error: ${response.status} - ${result.message || 'Unknown error'}`);
    }
    
    console.log('Lixinger National Debt API parsed result:', { code: result.code, message: result.message, hasData: !!result.data });
    
    if (result.code !== 1) {
      const errorMsg = `Lixinger National Debt API error (code: ${result.code}): ${result.message || 'Unknown error'}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    if (!result.data) {
      throw new Error('Lixinger National Debt API returned no data');
    }

    return result.data;
  } catch (error) {
    console.error('Error fetching Lixinger national debt data:', error);
    throw error;
  }
}

