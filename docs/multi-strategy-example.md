# 多策略组合使用示例

## 概述

`runNetWorth` 函数现在支持传入单个策略函数或策略函数数组，允许按顺序执行多个策略。

## 基本用法

### 单个策略（向后兼容）

```typescript
import { runNetWorth } from '@/app/backtest/common/calculations/base';

// 定义单个策略
const rebalanceStrategy = (netWorth: NetWorth) => {
  // 策略逻辑
  return adjustedNetWorth;
};

// 执行回测
const result = runNetWorth(stockData, initialNetWorth, rebalanceStrategy);
```

### 多个策略按顺序执行

```typescript
import { runNetWorth } from '@/app/backtest/common/calculations/base';

// 策略1: 根据估值调整股债比例
const valuationStrategy = (netWorth: NetWorth) => {
  const pe = getCurrentPE(netWorth.date);
  const targetStockRatio = calculateTargetRatio(pe);
  return adjustStockBondRatio(netWorth, targetStockRatio);
};

// 策略2: 在多只股票间做 rebalance
const stockRebalanceStrategy = (netWorth: NetWorth) => {
  return rebalanceStocks(netWorth);
};

// 策略3: 止损或止盈
const stopLossStrategy = (netWorth: NetWorth) => {
  const drawdown = calculateDrawdown(netWorth);
  if (drawdown > 0.15) {
    return reducePosition(netWorth);
  }
  return netWorth;
};

// 组合策略按顺序执行
const result = runNetWorth(
  stockData, 
  initialNetWorth, 
  [valuationStrategy, stockRebalanceStrategy, stopLossStrategy]
);
```

## 实际应用场景

### 场景1: 全天候策略 + 动态再平衡

```typescript
// 策略1: 股债比例调整（根据估值）
const assetAllocationStrategy = (netWorth: NetWorth) => {
  const erp = getEquityRiskPremium(netWorth.date);
  const targetStockRatio = erp > 0.03 ? 0.6 : 0.3;
  return adjustRatio(netWorth, targetStockRatio);
};

// 策略2: 股票组合内部再平衡
const withinStockRebalance = (netWorth: NetWorth) => {
  // 确保各股票按市值权重分配
  return rebalanceByMarketCap(netWorth);
};

// 策略3: 定期定投
const dcaStrategy = (netWorth: NetWorth) => {
  if (isMonthEnd(netWorth.date)) {
    return addCash(netWorth, 10000); // 每月定投1万
  }
  return netWorth;
};

const result = runNetWorth(
  stockData,
  initialNetWorth,
  [assetAllocationStrategy, withinStockRebalance, dcaStrategy]
);
```

### 场景2: 价值投资 + 风险控制

```typescript
// 策略1: 低估值加仓
const valueInvestingStrategy = (netWorth: NetWorth) => {
  const pe = getPE(netWorth.date);
  if (pe < 12) {
    return increasePosition(netWorth, 0.1); // 增加10%仓位
  }
  return netWorth;
};

// 策略2: 高估值减仓
const valuationExitStrategy = (netWorth: NetWorth) => {
  const pe = getPE(netWorth.date);
  if (pe > 18) {
    return decreasePosition(netWorth, 0.1); // 减少10%仓位
  }
  return netWorth;
};

// 策略3: 最大回撤保护
const drawdownProtection = (netWorth: NetWorth) => {
  const drawdown = calculateCurrentDrawdown(netWorth);
  if (drawdown > 0.20) { // 回撤超过20%
    return reduceToMinimum(netWorth); // 降低到最小仓位
  }
  return netWorth;
};

const result = runNetWorth(
  stockData,
  initialNetWorth,
  [valueInvestingStrategy, valuationExitStrategy, drawdownProtection]
);
```

### 场景3: 网格交易 + 趋势跟踪

```typescript
// 策略1: 网格交易
const gridStrategy = (netWorth: NetWorth) => {
  const price = getCurrentPrice(netWorth);
  const gridLevel = calculateGridLevel(price);
  return adjustPositionByGrid(netWorth, gridLevel);
};

// 策略2: 趋势跟踪
const trendFollowingStrategy = (netWorth: NetWorth) => {
  const ma20 = getMA(netWorth.date, 20);
  const ma60 = getMA(netWorth.date, 60);
  
  if (ma20 > ma60) {
    return increaseTrendPosition(netWorth);
  } else if (ma20 < ma60) {
    return decreaseTrendPosition(netWorth);
  }
  return netWorth;
};

const result = runNetWorth(
  stockData,
  initialNetWorth,
  [gridStrategy, trendFollowingStrategy]
);
```

## 关键特性

1. **顺序执行**: 策略函数按照数组顺序依次执行
2. **状态传递**: 每个策略接收前一个策略的输出作为输入
3. **向后兼容**: 仍然支持传入单个策略函数
4. **灵活组合**: 可以随意组合不同的策略

## 注意事项

1. **策略顺序很重要**: 不同的执行顺序可能产生不同的结果
2. **避免冲突**: 确保策略之间的逻辑不会相互冲突
3. **性能考虑**: 策略越多，执行时间越长
4. **测试验证**: 建议为每个策略和组合策略编写测试用例

## 最佳实践

1. **单一职责**: 每个策略函数应该专注于一个特定的任务
2. **可测试性**: 将策略函数独立出来，便于单独测试
3. **可复用性**: 设计通用的策略函数，可以在不同场景中复用
4. **文档注释**: 为每个策略函数添加清晰的注释说明其用途

## 示例：完整的回测流程

```typescript
import { runNetWorth, calculateResultFromNetWorth } from '@/app/backtest/common/calculations/base';
import { getStockData } from '@/lib/api';

// 定义策略
const strategies = [
  valuationBasedAllocation,   // 估值配置
  portfolioRebalance,          // 组合再平衡
  riskManagement,              // 风控
];

// 获取数据
const stockData = await getStockData('000300', '2020-01-01', '2024-12-31');

// 初始化
const initialNetWorth = {
  stockValue: [{ code: '000300', shares: 0, shareValue: 0 }],
  cash: 100000,
  totalValue: 100000,
};

// 运行回测
const netWorthTimeLine = runNetWorth(stockData, initialNetWorth, strategies);

// 计算结果
const result = calculateResultFromNetWorth(netWorthTimeLine, 100000, {
  includeStockPositions: true,
  includeCashData: true,
});

console.log('最终收益:', result.totalReturn);
console.log('年化收益:', result.annualizedReturn);
console.log('最大回撤:', result.maxDrawdown);
```

