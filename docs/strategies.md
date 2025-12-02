# 估值、回测和价值投资
------------------------

## 多策略组合支持

`runNetWorth` 函数现在支持传入单个策略函数或策略函数数组，允许按顺序执行多个策略：

```typescript
// 单个策略（向后兼容）
runNetWorth(stockData, initialNetWorth, singleStrategy);

// 多个策略按顺序执行
runNetWorth(stockData, initialNetWorth, [strategy1, strategy2, strategy3]);
```

**使用场景示例：**
- 策略1: 根据估值调整股债比例
- 策略2: 在多只股票间做 rebalance
- 策略3: 执行止损或止盈逻辑

每个策略函数接收当前的 `NetWorth`，并返回调整后的 `NetWorth`，多个策略会按顺序依次执行。

------------------------
# 宏观指标

* A股全指
* ERP 股权溢价
* 通胀指数 CPI、PPI， 有色金属
* 汇率


# 全天候策略， 股｜债｜抗通胀

### 组合间 rebalance


### 个股间 relalance
* 建立个股组合，定期rebalance
* 沪深300 or 红利低波 or 自选行业龙头股组合 or 自选高股息组合
* 根据行业周期切换股票仓位


# 价值投资策略
* Buy and hold
* Buy and hold and T or sell put
* relalance

# 海外价值投资策略

# 海外高股息策略

# 中国股息 x 海外股息 rebalance策略

# A x H 溢价策略

# 热钱流入追涨杀跌策略

# 波动做T策略