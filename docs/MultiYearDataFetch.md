# 多年数据获取功能说明

## 背景

理杏仁 API 限制每次请求最多只能获取 **10年** 的历史数据。为了展示更长时间（如20年）的数据，需要分批请求并合并结果。

## 解决方案

### 架构设计：服务器端处理

**将数据分批逻辑移到服务器端（API路由层）**，客户端只需发起一次请求，服务器端自动处理分批请求和数据合并。

**优势：**
1. ✅ 减少客户端网络请求次数
2. ✅ 降低客户端复杂度
3. ✅ 便于服务器端缓存
4. ✅ 统一的错误处理
5. ✅ 更好的性能和用户体验

### 实现位置

**服务器端：** `src/app/api/lixinger/route.ts`

#### 1. 添加分批获取辅助函数

```typescript
async function fetchDataInBatches(
  codes: string[],
  years: number,
  maxYearsPerRequest: number,
  startDate: string,
  endDate: string,
  metricsList: string[],
  type: 'stock' | 'index'
): Promise<LixingerNonFinancialData[]>
```

- 自动计算需要的批次数
- 循环分批请求数据
- 自动去重（基于日期+股票代码）并排序
- 在批次之间添加延迟（500ms）避免请求过快
- 失败时继续获取其他批次

#### 2. API 路由自动判断

```typescript
const MAX_YEARS_PER_REQUEST = 10;
const needsBatching = years > MAX_YEARS_PER_REQUEST;

if (needsBatching) {
  // 使用分批获取
  const data = await fetchDataInBatches(...);
} else {
  // 直接获取
  const data = await getNonFinancialData(...);
}
```

#### 3. 支持的数据类型

- ✅ **股票数据** (`getNonFinancialData`)
- ✅ **指数数据** (`getIndexFundamentalData`)  
- ✅ **国债数据** (`getNationalDebtData`)

### 客户端使用

客户端代码**无需修改**，直接请求任意年份的数据，服务器端自动处理：

#### 示例 1：现金国债页面
```typescript
const bondResponse = await fetch('/api/lixinger', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nationalDebtCodes: ['tcm_y10'],
    years: 20, // 请求20年数据，服务器端自动分批
  }),
});
```

#### 示例 2：定投沪深300页面
```typescript
const stockResponse = await fetch('/api/lixinger', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    stockCodes: ['000300'],
    codeTypeMap: { '000300': 'index' },
    years: 20, // 请求20年数据
    metricsList: ['cp'],
  }),
});
```

#### 示例 3：并行请求多种数据
```typescript
const [stockResponse, bondResponse] = await Promise.all([
  fetch('/api/lixinger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stockCodes: ['000300'],
      codeTypeMap: { '000300': 'index' },
      years: 20,
      metricsList: ['pe_ttm.mcw', 'cp', 'mc'],
    }),
  }),
  fetch('/api/lixinger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nationalDebtCodes: ['tcm_y10'],
      years: 20,
    }),
  })
]);
```

## 工作原理

### 服务器端分批流程

1. **接收请求：** 客户端请求 20年数据
2. **判断是否需要分批：** `years > 10`？
3. **计算批次数：** 20年 ÷ 10年/批 = 2批
4. **循环请求：**
   ```
   第1批：从最新日期往前10年
   等待 500ms
   第2批：再往前10年
   ```
5. **合并与去重：**
   - 使用 `Map<dateKey, data>` 去重
   - 按日期升序排序
6. **返回完整数据：** 一次性返回给客户端

### 示例流程

请求20年沪深300数据：

```
客户端 → 服务器：years=20

服务器内部：
  ├─ 判断：20 > 10，需要分批
  ├─ 批次1：获取10年数据 → 2431条
  ├─ 等待500ms
  ├─ 批次2：获取10年数据 → 2431条
  ├─ 合并去重 → 4862条（约20年）
  └─ 返回

服务器 → 客户端：4862条数据
```

## 更新的文件

### 服务器端
1. ✅ `src/app/api/lixinger/route.ts`
   - 添加 `fetchDataInBatches` 函数
   - 更新股票、指数、国债数据获取逻辑

### 客户端
2. ✅ `src/app/strategy/backtest/cash-bond/page.tsx`
   - 恢复为直接调用 API
   - 移除 `fetchBondDataMultiYear` 调用

3. ✅ `src/app/strategy/backtest/dca-csi300/page.tsx`
   - 恢复为直接调用 API
   - 移除 `fetchStockDataMultiYear` 调用

4. ✅ `src/app/strategy/backtest/page.tsx`
   - 恢复为直接调用 API
   - 移除 `fetchStockDataMultiYear` 和 `fetchBondDataMultiYear` 调用

5. ✅ `src/app/strategy/hooks/useStrategyData.ts`
   - 恢复为直接调用 API
   - 移除 `fetchDataMultiYear` 调用

6. ✅ `src/app/strategy/backtest/common/fetchDataMultiYear.ts`
   - **已删除**（功能已移到服务器端）

## 性能优化

### 服务器端
- ✅ 批次间添加 500ms 延迟，避免请求过快
- ✅ 失败容错：单批失败不影响其他批次
- ✅ 高效去重：使用 `Map` 数据结构
- ✅ 日志记录：记录每批次获取的数据量

### 客户端
- ✅ 并行请求：支持 `Promise.all` 并行获取多种数据
- ✅ 单次请求：每种数据类型只需一次 HTTP 请求
- ✅ 简化代码：无需关心分批逻辑

## 测试

所有 101 个测试通过 ✅
- 基础计算函数测试
- API 路由测试
- 策略计算测试
- 现金国债策略测试
- 定投策略测试

## 注意事项

1. **API限制：** 每批最多10年是理杏仁的硬性限制
2. **请求延迟：** 批次间500ms延迟可根据需要调整
3. **错误处理：** 单批失败时继续其他批次，但会记录错误日志
4. **数据去重：** 基于日期+股票代码去重，保留最新数据

## 未来改进

1. **缓存机制：** 在服务器端添加 Redis 缓存
2. **增量更新：** 智能判断已有数据，只请求缺失部分
3. **并行批次：** 多批次并行请求以提高速度
4. **重试机制：** 失败批次自动重试
5. **压缩传输：** 启用 gzip 压缩减少传输大小


