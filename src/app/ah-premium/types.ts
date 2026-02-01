/**
 * AH溢价策略相关类型定义
 */

// AH股票溢价数据类型
export interface AHPremiumData {
  aCode: string;
  hCode: string;
  name: string;
  industry: string;
  aPrice: number;
  hPrice: number;
  hPriceInCNY: number; // H股价格转换为人民币
  premium: number; // 溢价率 (%)
  // premiumChange30d?: number; // 30天溢价率变化 - TODO: 后续开发
}

// 控制面板Props
export interface ControlPanelProps {
  selectedIndustry: string;
  industries: string[];
  loading: boolean;
  onIndustryChange: (value: string) => void;
  onRefresh: () => void;
}

// 统计面板Props
export interface StatisticsPanelProps {
  data: AHPremiumData[];
}

// 溢价表格Props
export interface PremiumTableProps {
  title: string;
  subtitle: string;
  data: AHPremiumData[];
  topN: number;
  colorClass: string; // 'green' | 'red' | 'purple'
  type: 'positive' | 'negative' | 'change';
}

