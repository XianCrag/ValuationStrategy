# Strategy.ts 重构说明

## 重构日期
2025-11-27

## 版本历史

### v2.1 - 清理冗余代码（2025-11-27）
- ✅ 移除 `page.tsx` 中冗余的 bondData API 请求
- ✅ 删除未使用的 `bondData` state
- ✅ 删除未使用的 `BondData` 和 `TCM_Y10_CODE` 导入
- ✅ 简化错误处理逻辑
- ✅ 减少不必要的网络请求

### v2.0 - 简化参数（2025-11-27）
- ✅ 移除 `bondData` 参数
- ✅ 使用本地 `national-debt.json` 的历史利率数据
- ✅ 与对照组保持一致的数据源

### v1.0 - 初始重构（2025-11-27）
- ✅ 采用统一的 `runNetWorth` 框架
- ✅ 改进利息计算方式（月度复利）
- ✅ 优化初始仓位计算

## 重构原因

原有的 `strategy.ts` 实现存在以下问题：

1. **代码结构不一致**：与 `control-group1.ts` 和 `control-group2.ts` 使用完全不同的实现方式，导致代码重复和难以维护
2. **债券利息计算方式不合理**：年末一次性结算整年利息，而不是每月复利
3. **年度详情计算复杂**：内嵌在主循环中，难以测试和维护
4. **缺少抽象和复用**：调仓逻辑、收益计算、状态更新都耦合在一起

## 重构方案

### 核心改进

1. **采用统一框架**
   - 使用 `base.ts` 中的 `runNetWorth` + `calculateResultFromNetWorth` 通用框架
   - 与其他策略保持代码结构一致
   - 提高代码复用性和可维护性

2. **改进利息计算**
   - 从年末一次性结算改为每月计息并复利
   - 与对照组1保持一致
   - 更符合实际投资场景

3. **优化调仓逻辑**
   - 初始仓位根据第一天PE计算（不再固定60%）
   - 每6个月检查PE变化
   - 只要目标仓位改变就调仓（取消10%偏差阈值）

4. **增强 base.ts**
   - 添加 `bondData` 参数支持
   - 新增 `getBondRate` 和 `getMonthCashInterestFromBondData` 函数
   - 支持从实际数据获取利率而非本地静态文件

## 策略逻辑变化

### 旧逻辑
```typescript
- 初始仓位：固定 60%股票 + 40%债券
- 调仓条件：每6个月检查 + 仓位偏差超过10%
- 债券利息：年末一次性结算
```

### 新逻辑
```typescript
- 初始仓位：根据第一天PE动态计算
- 调仓条件：每6个月检查 + 目标仓位变化即调仓
- 债券利息：每月计息并复利（使用本地历史数据）
- 数据源：统一使用 national-debt.json
```

## 参数简化与代码清理（v2.0 - v2.1）

### 为什么移除 bondData 参数？（v2.0）

1. **数据重复**：
   - API 返回的 bondData 与本地 `national-debt.json` 包含相同的历史数据
   - 没有必要传递额外的参数

2. **一致性**：
   - 对照组1和2都使用本地数据
   - 策略应该保持一致

3. **简化接口**：
   ```typescript
   // 旧: calculateStrategy(stockData, bondData, initialCapital)
   // 新: calculateStrategy(stockData, initialCapital)
   ```

4. **无损准确性**：
   - 本地 JSON 文件包含完整的历史利率（2002-2024）
   - 按月粒度，数据充分准确

### 为什么删除 page.tsx 的 bondData 请求？（v2.1）

虽然 v2.0 移除了 `calculateStrategy` 的 bondData 参数，但 `page.tsx` 仍在请求国债数据：

```typescript
// v2.0 中仍存在的冗余代码
const [bondResponse] = await Promise.all([
  // ...获取股票数据
  fetch('/api/lixinger', {
    body: JSON.stringify({
      nationalDebtCodes: [TCM_Y10_CODE],  // ❌ 冗余请求
      years: selectedYears,
    }),
  })
]);
```

**问题：**
- ❌ 请求了 bondData 但从未使用
- ❌ 每次加载页面都浪费一次 API 调用
- ❌ 增加加载时间
- ❌ 维护不必要的状态变量

**v2.1 改进：**
- ✅ 删除 bondData API 请求
- ✅ 删除 `bondData` state 和 `setBondData`
- ✅ 删除未使用的导入（`BondData`, `TCM_Y10_CODE`）
- ✅ 简化为单个 API 请求
- ✅ 更快的页面加载速度

## 文件变更

### 修改的文件

1. **`base.ts`**
   - 添加 `BondData` 类型导入
   - 新增 `getBondRate` 函数
   - 新增 `getMonthCashInterestFromBondData` 函数
   - `runNetWorth` 添加可选的 `bondData` 参数（保持向后兼容）

2. **`strategy.ts`** （v2.0 更新）
   - 完全重写，使用 `runNetWorth` 框架
   - 移除 `bondData` 参数
   - 代码从 315 行优化到约 300 行
   - 逻辑更清晰，易于理解和维护

3. **`page.tsx`** （v2.1 更新）
   - ✅ 删除冗余的 bondData API 请求
   - ✅ 删除 `bondData` state 和 `setBondData`
   - ✅ 删除未使用的 `BondData` 和 `TCM_Y10_CODE` 导入
   - ✅ 简化为单个 API 请求（仅获取股票数据）
   - ✅ 更新注释说明使用本地数据

4. **`control-group1.ts`** & **`control-group2.ts`**
   - 更新 `runNetWorth` 调用（添加注释说明）
   - 移除 console.log 调试信息

5. **`calculations.test.ts`** （v2.0 更新）
   - 更新初始仓位测试（从固定60%改为动态计算）
   - 移除所有 `bondData` 参数

### 新增的文件

1. **`strategy-new.test.ts`** （v2.0 更新）
   - 全新的测试文件，13个测试用例
   - 覆盖初始仓位、PE映射、调仓逻辑、收益计算等
   - 移除所有 `bondData` 相关代码

### 更新的文档

1. **`strategy_backtesting.md`**
   - 更新策略说明，标注已重构 ✅
   - 详细说明新的规则和实现

## 测试结果

### 重构前
- 原有测试：20个，全部通过 ✅

### 重构后
- 原有测试：20个，全部通过 ✅
- 新增测试：13个，全部通过 ✅
- 所有测试：108个，全部通过 ✅

## 向后兼容性

### 接口变化（v2.0）
- ⚠️ **破坏性变更**：`calculateStrategy` 移除了 `bondData` 参数
  - 旧：`calculateStrategy(stockData, bondData, initialCapital)`
  - 新：`calculateStrategy(stockData, initialCapital)`
- ✅ 返回类型保持不变：`StrategyResult`
- ✅ 所有必需字段都存在

### 行为变化
- ⚠️ 初始仓位不再固定60%，而是根据PE计算
- ⚠️ 交易次数可能减少（取消10%阈值）
- ⚠️ 最终收益可能略有不同（利息计算方式改变）
- ✅ 数据源统一使用本地 JSON（v2.0）

## 性能影响

- ✅ 代码更简洁，执行效率提升
- ✅ 利用 base.ts 的优化逻辑
- ✅ 减少重复计算

## 后续优化建议

1. 考虑添加交易成本模拟（手续费、印花税等）
2. 支持自定义调仓频率（目前固定6个月）
3. 支持自定义PE阈值范围（目前固定11-16）
4. 添加更多回测指标（夏普比率、索提诺比率等）

## 总结

本次重构（v1.0, v2.0, v2.1）成功实现了：
- ✅ 代码统一化和模块化
- ✅ 利息计算合理化
- ✅ 策略逻辑优化
- ✅ 参数简化（v2.0）
- ✅ 数据源一致性（v2.0）
- ✅ 清理冗余代码（v2.1）
- ✅ 优化性能和加载速度（v2.1）
- ✅ 完整的测试覆盖

重构后的代码更简洁、更快速、更易维护、更易扩展，为未来的功能迭代打下了良好基础。

### 关键改进总结

| 方面 | 旧实现 | 新实现 (v2.1) | 改进 |
|------|--------|---------------|------|
| 代码结构 | 独立实现，315行 | 使用框架，约300行 | ✅ 更简洁 |
| 利息计算 | 年末一次性 | 每月复利 | ✅ 更准确 |
| 初始仓位 | 固定60% | 根据PE计算 | ✅ 更合理 |
| 调仓逻辑 | 6个月+10%阈值 | 6个月+PE变化 | ✅ 更敏感 |
| 参数数量 | 3个参数 | 2个参数 | ✅ 更简洁 |
| 数据源 | 需要传入 bondData | 使用本地数据 | ✅ 更统一 |
| API 请求 | 2个请求（股票+债券） | 1个请求（股票） | ✅ 更快速 |
| 冗余代码 | bondData state | 已删除 | ✅ 更干净 |
| 测试覆盖 | 20个测试 | 33个测试 | ✅ 更完善 |

### 性能提升（v2.1）

- ⚡ **减少50%的API请求**：从2个请求减少到1个
- ⚡ **更快的页面加载**：无需等待国债数据
- ⚡ **减少内存使用**：不再存储未使用的 bondData
- ⚡ **简化错误处理**：只需处理一个请求的错误

