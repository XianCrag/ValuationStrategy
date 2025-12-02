/**
 * Lixinger API Utils
 * 理杏仁开放API工具函数
 */

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

/**
 * 获取 Lixinger Token
 */
export function getLixingerToken(): string {
  const token = process.env.LIXINGER_TOKEN;
  
  if (!token || token === 'your_lixinger_token_here') {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      throw new Error(
        'LIXINGER_TOKEN 未配置。请在项目根目录的 .env.local 文件中添加：\n' +
        'LIXINGER_TOKEN=your_actual_token\n\n' +
        '获取 Token: https://open.lixinger.com\n' +
        '配置后请重启开发服务器 (npm run dev)'
      );
    } else {
      throw new Error(
        'LIXINGER_TOKEN environment variable is not configured.\n' +
        'Please set LIXINGER_TOKEN in your deployment environment.\n\n' +
        'Get your token from: https://open.lixinger.com'
      );
    }
  }

  return token;
}

/**
 * 通用的 Lixinger API 数据获取函数
 * @param url API 端点 URL
 * @param params 请求参数（不包含 token）
 * @returns API 响应数据
 */
export async function fetchLixingerData<T>(
  url: string,
  params: Record<string, any>
): Promise<T> {
  const token = getLixingerToken();
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token,
      ...params,
    }),
  });

  if (!response.ok) {
    throw new Error(`Lixinger API request failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

