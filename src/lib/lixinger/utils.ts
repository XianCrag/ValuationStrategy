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
    throw new Error(
      'LIXINGER_TOKEN 未配置。请在项目根目录的 .env.local 文件中添加：\n' +
      'LIXINGER_TOKEN=your_actual_token\n\n' +
      '获取 Token: https://open.lixinger.com\n' +
      '配置后请重启开发服务器 (npm run dev)'
    );
  }

  return token;
}

