export const formatNumber = (num?: number): string => {
  if (num === undefined || num === null) return 'N/A';
  
  // 处理负数：取绝对值格式化后加上负号
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  
  let formatted: string;
  if (absNum >= 1000000000000) {
    formatted = (absNum / 1000000000000).toFixed(2) + '万亿';
  } else if (absNum >= 100000000) {
    formatted = (absNum / 100000000).toFixed(2) + '亿';
  } else if (absNum >= 10000) {
    formatted = (absNum / 10000).toFixed(2) + '万';
  } else {
    formatted = absNum.toFixed(2);
  }
  
  return isNegative ? '-' + formatted : formatted;
};

export const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('zh-CN');
};

export const formatDateShort = (dateStr: string): string => {
  const date = new Date(dateStr);
  return `${date.getFullYear()}/${date.getMonth() + 1}`;
};

