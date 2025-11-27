/**
 * Lixinger Fund Data API
 * 理杏仁基金数据API - 获取基金复权净值数据
 */

import { LixingerApiResponse } from './types';
import { getLixingerToken } from './utils';

/**
 * 基金净值数据接口
 */
export interface LixingerFundData {
  date: string;
  netValue: number; // 复权净值
  stockCode?: string; // 添加stockCode字段以保持API一致性
  cp?: number; // 映射到cp字段（收盘价）以兼容现有代码
}

/**
 * 获取基金复权净值数据
 * @param fundCodes 基金代码列表，格式如 ['510300']
 * @param startDate 开始日期，格式 YYYY-MM-DD
 * @param endDate 结束日期，格式 YYYY-MM-DD
 */
export async function getFundData(
  fundCodes: string[],
  startDate: string,
  endDate: string,
): Promise<LixingerFundData[]> {
  const token = getLixingerToken();

  const baseUrl = 'https://open.lixinger.com/api/cn/fund/net-value-of-dividend-reinvestment';
  
  // 为每个基金代码单独请求（因为API一次只支持一个基金）
  const allData: LixingerFundData[] = [];
  
  for (const fundCode of fundCodes) {
    const requestBody = {
      stockCode: fundCode, // 基金API使用单个stockCode字符串
      startDate,
      endDate,
      token,
    };

    console.log('Lixinger Fund API request:', {
      url: baseUrl,
      fundCode,
      startDate,
      endDate,
    });

    try {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      let result: LixingerApiResponse<Array<{ date: string; netValue: number }>>;
      try {
        result = await response.json();
        console.log('Lixinger Fund API parsed result:', { 
          code: result.code, 
          message: result.message, 
          dataLength: Array.isArray(result.data) ? result.data.length : 'not array' 
        });
      } catch (jsonError) {
        const errorText = await response.text().catch(() => 'Unable to read response');
        console.error('JSON parse error:', jsonError, 'Response text:', errorText.substring(0, 500));
        throw new Error(`Failed to parse Lixinger Fund API response: ${jsonError instanceof Error ? jsonError.message : 'Unknown parse error'}`);
      }

      if (!response.ok) {
        throw new Error(`Lixinger Fund API HTTP error: ${response.status} - ${result.message || 'Unknown error'}`);
      }
      
      if (result.code !== 1) {
        const errorMsg = `Lixinger Fund API error (code: ${result.code}): ${result.message || 'Unknown error'}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      if (!result.data) {
        throw new Error(`Lixinger Fund API returned no data for ${fundCode}`);
      }

      // 将数据转换为统一格式，添加stockCode字段并映射cp字段
      const formattedData = result.data.map(item => ({
        ...item,
        stockCode: fundCode,
        cp: item.netValue, // 将netValue映射到cp字段以兼容现有代码
      }));

      allData.push(...formattedData);
    } catch (error) {
      console.error(`Error fetching Lixinger fund data for ${fundCode}:`, error);
      throw error;
    }
  }

  return allData;
}

