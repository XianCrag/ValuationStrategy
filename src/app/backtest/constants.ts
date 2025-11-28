import { 
  CSI300_INDEX_STOCK,
  CSI300_FUND_STOCK,
  A_STOCK_ALL_STOCK,
  NATIONAL_DEBT_STOCK,
} from '@/constants/stocks';

// 重新导出配置对象供其他模块使用
export { 
  CSI300_INDEX_STOCK,
  CSI300_FUND_STOCK,
  A_STOCK_ALL_STOCK,
  NATIONAL_DEBT_STOCK,
};

// ============================================
// 策略参数常量
// ============================================

export const PE_MIN = 11;
export const PE_MAX = 16;
export const INITIAL_CAPITAL = 1000000; // 初始资金100万
export const REVIEW_INTERVAL_MONTHS = 6; // 每6个月review一次
export const REBALANCE_THRESHOLD = 0.1; // 股债再平衡阈值：股票仓位与目标仓位超过10%时进行
export const BANK_INTEREST_RATE = 0.03; // 银行年利率 3%（对照组1）
export const DCA_MONTHS = 48; // 定投月数 4年 = 48个月（对照组2）
export const DATA_YEARS = 20; // 数据年限

// 计算目标股票仓位：PE范围11-16，11时60%，12时50%，以此类推，16以上10%
export function calculateTargetStockRatio(pe: number): number {
  if (pe <= PE_MIN) {
    return 0.6; // 60%
  } else if (pe >= PE_MAX) {
    return 0.1; // 10%
  } else {
    // 线性插值：PE从11到16，仓位从60%降到10%
    const ratio = 0.6 - ((pe - PE_MIN) / (PE_MAX - PE_MIN)) * 0.5;
    return Math.max(0.1, Math.min(0.6, ratio));
  }
}
