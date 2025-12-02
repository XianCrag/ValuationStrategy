# 个股数据指标说明

## 个股 vs 指数指标的区别

### 指数数据指标

指数（如沪深300、A股全指）使用**市值加权**的指标：

```typescript
import { INDEX_FULL_METRICS } from '@/constants/metrics';
// INDEX_FULL_METRICS = ['pe_ttm.mcw', 'cp', 'mc']

const indexData = await fetchLixingerData({
  stockCodes: ['000300'], // 沪深300
  codeTypeMap: { '000300': 'index' },
  years: 10,
  metricsList: INDEX_FULL_METRICS,
});
```

**指标说明：**
- `pe_ttm.mcw`: PE TTM 市值加权（Market Cap Weighted）
- `cp`: 收盘点位
- `mc`: 总市值

### 个股数据指标

个股使用**单个公司**的指标（来自 non_financial API）：

```typescript
import { INDIVIDUAL_STOCK_METRICS } from '@/constants/metrics';
// INDIVIDUAL_STOCK_METRICS = ['sp', 'pe_ttm', 'mc', 'dyr']

const stockData = await fetchLixingerData({
  stockCodes: ['601088'], // 中国神华
  codeTypeMap: { '601088': 'stock' },
  years: 10,
});
```

**指标说明：**
- `sp`: 股票价格（Stock Price）
- `pe_ttm`: PE TTM 市盈率（单个公司）
- `mc`: 总市值
- `dyr`: 股息率（Dividend Yield Rate）

**注意：** 个股 non_financial API **不支持** `cp`（收盘点位），个股使用 `sp`（股票价格）。

## 关键区别

| 指标 | 指数 | 个股 (non_financial) | 说明 |
|-----|------|------|------|
| PE TTM | `pe_ttm.mcw` | `pe_ttm` | 指数用市值加权，个股用公司本身的PE |
| 价格/点位 | `cp` | `sp` | 指数用点位，个股用股票价格 |
| 市值 | `mc` | `mc` | 都表示市值 |
| 股息率 | ❌ | `dyr` | 仅个股有股息率指标 |

## 常见错误

### ❌ 错误：个股使用指数指标

```typescript
// 错误：个股不能使用 pe_ttm.mcw 和 cp
const stockData = await fetchLixingerData({
  stockCodes: ['601088'],
  codeTypeMap: { '601088': 'stock' },
});
// 如果传 metricsList: ['pe_ttm.mcw', 'cp', 'mc']，API 会报错
```

### ❌ 错误：个股使用 cp 而不是 sp

```typescript
// 错误：non_financial API 不支持 cp，应该用 sp
const stockData = await fetchLixingerData({
  stockCodes: ['601088'],
  codeTypeMap: { '601088': 'stock' },
});
// metricsList: ['cp'] ❌ 应该用 'sp'
```

### ✅ 正确：使用个股专用指标

```typescript
// API 会自动使用 INDIVIDUAL_STOCK_METRICS = ['sp', 'pe_ttm', 'mc', 'dyr']
const stockData = await fetchLixingerData({
  stockCodes: ['601088'],
  codeTypeMap: { '601088': 'stock' },
  years: 10,
});
```

## 不同策略应使用的指标

### 1. 仅需价格数据的策略（如定投）

```typescript
import { PRICE_ONLY_METRICS } from '@/constants/metrics';
// PRICE_ONLY_METRICS = ['cp']

// 适用于：定投、均值回归等仅需要价格的策略
```

### 2. 需要估值的策略（如PE轮动）

```typescript
import { INDEX_FULL_METRICS } from '@/constants/metrics';
// INDEX_FULL_METRICS = ['pe_ttm.mcw', 'cp', 'mc']

// 适用于：指数PE轮动、估值分位数策略等
```

### 1. 个股价值投资策略

```typescript
import { INDIVIDUAL_STOCK_METRICS } from '@/constants/metrics';
// INDIVIDUAL_STOCK_METRICS = ['sp', 'pe_ttm', 'mc', 'dyr']

// API 会根据 codeTypeMap 自动使用个股指标
const stockData = await fetchLixingerData({
  stockCodes: ['601088'],
  codeTypeMap: { '601088': 'stock' },
  years: 10,
});

// 返回数据包含: sp（股票价格）、pe_ttm、mc、dyr
```

## 相关文件

- 指标常量定义：`src/constants/metrics.ts`
- 个股数据Hook：`src/app/indicators/hooks/useIndividualStockData.ts`
- 指标页面：`src/app/indicators/page.tsx`
- API路由：`src/app/api/lixinger/route.ts`

