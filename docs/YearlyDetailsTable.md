# 年度详情表格组件使用指南

## 概述

`YearlyDetailsTable` 是一个统一的年度详情表格组件，用于展示不同策略的年度数据，包含股票和现金数据的变化。**支持多个股票代码的持仓展示**。

## 统一数据结构

所有策略现在使用统一的 `YearlyDetail` 接口：

```typescript
interface StockPosition {
  code: string;     // 股票代码
  shares: number;   // 份额
  value: number;    // 市值
  price: number;    // 价格
}

interface YearlyDetail {
  year: string;
  // 基础数据
  startValue: number;
  endValue: number;
  return: number;
  
  // 股票相关数据（支持多个股票）
  startStockValue?: number;
  endStockValue?: number;
  startStockPositions?: StockPosition[]; // 年初持仓（支持多个股票）
  endStockPositions?: StockPosition[];   // 年末持仓（支持多个股票）
  stockValue?: number; // 年末股票价值（兼容旧格式）
  stockBuyAmount?: number;
  stockSellAmount?: number;
  stockPriceChange?: number;
  startIndexPrice?: number;
  endIndexPrice?: number;
  investedAmount?: number; // 定投金额
  
  // 现金/债券相关数据
  startCash?: number;
  endCash?: number;
  startBondValue?: number;
  endBondValue?: number;
  bondBuyAmount?: number;
  bondSellAmount?: number;
  bondInterest?: number;
  interest?: number; // 利息（兼容旧格式）
  cashInterest?: number; // 现金利息
  
  // 其他
  trades?: number; // 交易次数
  finalValue?: number; // 最终价值（兼容旧格式）
}
```

## 使用方法

### 1. 现金国债策略

```tsx
import { YearlyDetailsTable } from '@/app/strategy/components/YearlyDetailsTable';

function CashBondPage() {
  const result = calculateControlGroup1(...);
  
  return (
    <YearlyDetailsTable 
      yearlyDetails={result.yearlyDetails}
      strategyType="cash-bond"
    />
  );
}
```

**显示的列：**
- 年份、年初价值、年末价值
- 年初现金、年末现金、现金利息
- 收益率

### 2. 定投沪深300策略

```tsx
import { YearlyDetailsTable } from '@/app/strategy/components/YearlyDetailsTable';

function DCAPage() {
  const result = calculateControlGroup2(...);
  
  return (
    <YearlyDetailsTable 
      yearlyDetails={result.yearlyDetails}
      strategyType="dca"
      showStockPositions={true}  // 显示详细持仓
    />
  );
}
```

**显示的列：**
- 年份、年初价值、年末价值
- 年初股票、年末股票、定投金额
- **年初持仓、年末持仓**（如果 showStockPositions=true）
- 年初现金、年末现金、现金利息
- 收益率

**持仓格式：**`000300: 200.0000份 (¥600,000)`

### 3. 动态调仓策略

```tsx
import { YearlyDetailsTable } from '@/app/strategy/components/YearlyDetailsTable';

function StrategyPage() {
  const result = calculateStrategy(...);
  
  return (
    <YearlyDetailsTable 
      yearlyDetails={result.yearlyDetails}
      strategyType="strategy"
      showStockPositions={true}  // 显示详细持仓
    />
  );
}
```

**显示的列：**
- 年份、年初价值、年末价值
- 年初股票、年末股票、买入股票、卖出股票
- **年初持仓、年末持仓**（如果 showStockPositions=true）
- 年初债券、年末债券、买入债券、卖出债券、债券利息
- 交易次数、收益率

## 多股票代码支持

### 持仓数据结构

组件通过 `startStockPositions` 和 `endStockPositions` 字段支持多个股票代码：

```typescript
const yearlyDetail: YearlyDetail = {
  year: '2020',
  startValue: 1000000,
  endValue: 1120000,
  return: 12.0,
  
  // 多个股票持仓
  startStockPositions: [
    { code: '000300', shares: 200.0, value: 400000, price: 2000 },
    { code: '000016', shares: 150.0, value: 300000, price: 2000 },
  ],
  endStockPositions: [
    { code: '000300', shares: 220.0, value: 484000, price: 2200 },
    { code: '000016', shares: 160.0, value: 336000, price: 2100 },
  ],
  
  // ... 其他字段
};
```

### 计算函数自动提取持仓

`calculateControlGroup2` 已经自动从 `NetWorth.stockValue` 数组中提取持仓信息：

```typescript
const startStockPositions: StockPosition[] = yearStartNetWorth.stockValue
  .filter(stock => stock.shares > 0)
  .map(stock => ({
    code: stock.code,
    shares: stock.shares,
    value: stock.shares * stock.shareValue,
    price: stock.shareValue,
  }));
```

### 持仓展示特性

- 支持任意数量的股票代码
- 自动过滤零持仓
- 格式化显示：`股票代码: 份额 (市值)`
- 鼠标悬停显示完整信息（避免截断）
- 自动横向滚动处理长内容

## 样式特点

- 响应式设计，自动横向滚动
- 第一列（年份）固定，方便查看
- 不同数据类型使用不同颜色：
  - 买入/利息：绿色
  - 卖出：红色
  - 正收益率：绿色，加粗
  - 负收益率：红色，加粗
- 悬停行高亮
- 持仓列使用小字体，节省空间

## 数据计算更新

所有策略计算函数已更新，包含现金和股票的详细变化：

### calculateControlGroup1（现金国债）
- 新增：`startCash`, `endCash`, `cashInterest`

### calculateControlGroup2（定投）
- 新增：`startStockValue`, `endStockValue`, `startCash`, `endCash`
- 新增：`startStockPositions`, `endStockPositions` （支持多个股票）
- 保留：`stockValue`（向后兼容）

### calculateStrategy（动态调仓）
- 已包含所有股票和债券数据
- 可扩展支持多个股票的持仓详情

## 优势

1. **统一格式**：所有策略使用相同的数据结构和组件
2. **灵活展示**：根据策略类型自动显示相关列
3. **多股票支持**：原生支持多个股票代码的持仓展示
4. **易于维护**：修改一处，所有地方生效
5. **类型安全**：完整的 TypeScript 类型定义
6. **向后兼容**：保留旧字段，不影响现有代码
7. **可选详情**：通过 `showStockPositions` 控制是否显示详细持仓

## 示例页面

访问 `/strategy/backtest/yearly-details-example` 查看完整示例，包含三种策略的年度详情展示。

