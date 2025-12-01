# 全局回测数据管理

## 概述

为了避免在回测计算函数中频繁传递公共数据（如国债数据），我们实现了一个全局数据管理器。计算函数可以直接访问全局数据，无需通过参数传递。

## 架构设计

### 全局数据管理器

位置：`src/lib/backtestData.ts`

使用单例模式，确保全局只有一个数据实例：

```typescript
import { setBondData, getBondRate, getMonthCashInterest } from '@/lib/backtestData';
```

### 工作流程

```
1. 页面加载
    ↓
2. 从 API 获取 bondData
    ↓
3. setBondData(bondData) - 设置全局数据
    ↓
4. 调用计算函数（如 calculateERPStrategy）
    ↓
5. 计算函数内部通过 getMonthCashInterest() 获取利率
    ↓
6. 全局管理器自动查找最近的历史数据
```

## 使用方法

### 1. 在页面中设置全局数据

```typescript
// src/app/backtest/erp-strategy/page.tsx

import { setBondData } from '@/lib/backtestData';

const { data, result } = useBacktestData({
  fetchData: async () => {
    // 获取数据
    const bondData = await fetchLixingerData<BondData>({
      nationalDebtCodes: [NATIONAL_DEBT_STOCK.code],
      years: selectedYears,
      metricsList: [METRIC_TCM_Y10],
    });
    
    return { bondData, ...otherData };
  },
  calculateResult: (data) => {
    // 设置全局数据
    setBondData(data.bondData);
    
    // 调用计算函数（不需要传递 bondData）
    return calculateERPStrategy(
      data.aStockData,
      data.csi300Data,
      data.bondData, // 可以保留以兼容旧代码
      INITIAL_CAPITAL,
      params
    );
  },
});
```

### 2. 在计算函数中使用全局数据

```typescript
// src/app/backtest/common/calculations/base.ts

import { backtestDataManager } from "@/lib/backtestData";

export function getMonthNationalDebtRate(date: string) {
  return backtestDataManager.getBondRate(date);
}

export function getMonthCashInterest(date: string, cash: number) {
  return backtestDataManager.getMonthCashInterest(date, cash);
}
```

### 3. 在策略中无需传递 bondData

```typescript
// src/app/backtest/erp-strategy/calculations.ts

export function calculateERPStrategy(
  aStockData: StockData[],
  csi300Data: StockData[],
  bondData: BondData[], // 保留参数以兼容，但内部不使用
  initialCapital: number,
  params: ERPStrategyParams
): StrategyResult {
  // runNetWorth 内部会自动使用全局数据管理器获取利率
  const netWorthTimeLine = runNetWorth(
    csi300Data,
    initialNetWorth,
    rebalanceStrategy
    // 不需要传递 bondData
  );
  
  // ...
}
```

## API 参考

### setBondData(data: BondData[])

设置全局国债数据。

```typescript
setBondData([
  { date: '2020-01', tcm_y10: 0.03 },
  { date: '2020-02', tcm_y10: 0.032 },
]);
```

### getBondRate(date: string): number

获取指定日期的国债利率。

- 如果存在精确匹配，返回该利率
- 如果不存在，返回最近的历史数据
- 如果完全没有数据，返回默认值 3%

```typescript
const rate = getBondRate('2020-01-15'); // 返回 2020-01 的利率
```

### getMonthCashInterest(date: string, cash: number): number

计算月度现金利息。

```typescript
const interest = getMonthCashInterest('2020-01-15', 1000000);
// 返回：1000000 * rate / 12
```

### backtestDataManager

全局管理器实例，提供更多方法：

```typescript
import { backtestDataManager } from '@/lib/backtestData';

// 检查是否有数据
backtestDataManager.hasData(); // true/false

// 获取统计信息
backtestDataManager.getStats();
// 返回：{ totalRecords: 282, dateRange: { start: '2002-06', end: '2024-12' } }

// 清空数据
backtestDataManager.clear();
```

## 智能数据匹配

全局管理器会智能匹配最近的数据：

1. **精确匹配**：如果存在该日期的数据，直接返回
2. **历史匹配**：优先查找最近的历史数据（日期 ≤ 目标日期）
3. **最近匹配**：如果没有历史数据，查找最近的数据（包括未来）
4. **默认值**：如果完全没有数据，返回 3%

示例：

```
数据：2020-06, 2020-12, 2021-06
查询：2020-09  → 返回 2020-06 的数据（最近的历史）
查询：2021-03  → 返回 2020-12 的数据（最近的历史）
查询：2020-01  → 返回 2020-06 的数据（最近的数据）
查询：1999-01  → 返回 2020-06 的数据（最早的数据）
```

## 测试

在测试中需要设置全局数据：

```typescript
import { setBondData } from '@/lib/backtestData';
import nationalDebtData from '@/data/national-debt.json';

beforeAll(() => {
  // 将 JSON 数据转换为 BondData 格式
  const bondDataArray: BondData[] = [];
  Object.entries(nationalDebtData.data).forEach(([year, monthData]) => {
    monthData.forEach((item: any) => {
      bondDataArray.push({
        date: item.date,
        tcm_y10: item.tcm_y10,
      });
    });
  });
  
  setBondData(bondDataArray);
});

afterAll(() => {
  const { backtestDataManager } = require('@/lib/backtestData');
  backtestDataManager.clear();
});
```

## 与缓存系统的配合

全局数据管理器与缓存系统完美配合：

1. **首次请求**：从 API 获取数据（2-5秒）→ 缓存 + 设置全局
2. **后续请求**：从缓存获取（10-50ms）→ 设置全局
3. **计算**：使用全局数据（无需传参）

## 优势

✅ **简化函数签名**：不需要在每个函数中传递 bondData  
✅ **统一数据源**：确保所有计算使用相同的数据  
✅ **智能匹配**：自动查找最近的历史数据  
✅ **向后兼容**：保留原有参数以兼容旧代码  
✅ **易于测试**：测试前统一设置数据  
✅ **性能优化**：与缓存系统配合，大幅提升性能  

## 迁移指南

### 旧代码（传参方式）

```typescript
export function calculateStrategy(
  stockData: StockData[],
  bondData: BondData[], // 需要传递
  initialCapital: number
) {
  const netWorth = runNetWorth(stockData, initial, strategy, bondData);
}
```

### 新代码（全局方式）

```typescript
import { setBondData } from '@/lib/backtestData';

// 在页面中设置
setBondData(bondData);

// 计算函数不需要 bondData 参数
export function calculateStrategy(
  stockData: StockData[],
  initialCapital: number
) {
  const netWorth = runNetWorth(stockData, initial, strategy);
  // runNetWorth 内部自动从全局获取利率
}
```

## 注意事项

1. **数据生命周期**：全局数据在页面切换时会保留，如果需要清空可以调用 `clear()`
2. **并发安全**：单例模式确保全局只有一个实例，但多个策略同时计算会共享数据
3. **测试隔离**：在测试中使用 `beforeAll` 和 `afterAll` 确保测试隔离

## 完整示例

查看完整实现：

- 全局管理器：`src/lib/backtestData.ts`
- 使用示例：`src/app/backtest/erp-strategy/page.tsx`
- 计算函数：`src/app/backtest/common/calculations/base.ts`
- 测试示例：`src/app/backtest/common/calculations/base.test.ts`

