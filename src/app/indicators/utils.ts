export const formatNumber = (num?: number): string => {
  if (num === undefined || num === null) return 'N/A';
  if (num >= 1000000000000) {
    return (num / 1000000000000).toFixed(2) + '万亿';
  }
  if (num >= 100000000) {
    return (num / 100000000).toFixed(2) + '亿';
  }
  if (num >= 10000) {
    return (num / 10000).toFixed(2) + '万';
  }
  return num.toFixed(2);
};

export const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('zh-CN');
};

export const formatDateShort = (dateStr: string): string => {
  const date = new Date(dateStr);
  return `${date.getFullYear()}/${date.getMonth() + 1}`;
};

