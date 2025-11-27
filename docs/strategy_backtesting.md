# strategy backtesting

### API 对接 ✅

* 对接平台: lixinger
* token: 从本地文件 .env.local 中获取 (参考 LIXINGER_SETUP.md)
* API - list
    * 获取股票数据： https://open.lixinger.com/api/cn/company/fundamental/non_financial
    * 获取指数数据：https://open.lixinger.com/api/cn/index/fundamental
    * 指数基金数据: https://open.lixinger.com/api/cn/fund/net-value-of-dividend-reinvestment
        * req
        ```
        {
	"token": "3c8a2837-984b-4a1c-a2fc-f93775868abf",
	"startDate": "2025-11-25",
	"endDate": "2025-11-27",
	"stockCode": "510300"
}
```
        * res
            ```
            {
  "code": 1,
  "message": "success",
  "data": [
    {
      "date": "2025-11-26T00:00:00+08:00",
      "netValue": 2.103
    },
    {
      "date": "2025-11-25T00:00:00+08:00",
      "netValue": 2.09
    }
  ]
}
            ```
    * 获取ETF基金净值数据：https://open.lixinger.com/api/cn/fund/net-value-of-dividend-reinvestment
    * 国债接口： https://open.lixinger.com/api/macro/national-debt
        * token, startDate, endDate, areaCode(cn, hk, us), metricsList
* 实现状态：
    * ✅ Lixinger API 客户端 (`src/lib/lixinger.ts`)
    * ✅ API 路由 (`/api/lixinger`)
    * ✅ 数据展示页面 (`/strategy`)

### 我关注的标的
1. A股: 沪深300指数基金 (代码: 510300) - 使用基金复权净值数据
2. 10年期国债 (代码: tcm_y10)

### 为什么使用基金而不是指数？
- **复权净值**：基金的复权净值已经考虑了分红再投资，更准确反映实际投资收益
- **可交易性**：指数基金（ETF）是可以实际交易的产品，更贴近真实投资场景
- **费用考虑**：基金净值已包含管理费等成本，更接近真实收益

### 我关注的指标
 * [市值, mc]
 * [PE, pe_ttm]

### 策略1 - 股债平衡策略（已重构 ✅）

**策略规则：**

1. **PE-仓位映射**
   - PE ≤ 11: 股票仓位 60%
   - PE ≥ 16: 股票仓位 10%
   - 11 < PE < 16: 线性插值（PE 12→50%, PE 13→40%, PE 14→30%, PE 15→20%）

2. **初始仓位**
   - 根据第一天的PE值计算初始股票仓位
   - 不再固定为60%股票 + 40%债券

3. **调仓触发条件**
   - 每6个月检查一次PE
   - 如果目标仓位与当前仓位不同，立即调仓
   - ~~取消了10%的偏差阈值~~（只要目标变化就调仓）

4. **债券/现金管理**
   - 所有现金以国债形式存在
   - 每月计息（使用实际国债利率）
   - 利息自动再投入复利

5. **实现架构**
   - 使用统一的 `runNetWorth` + `calculateResultFromNetWorth` 框架
   - 与对照组1、对照组2保持代码结构一致
   - 利息计算方式统一

**输出数据：**
- `trades`: 交易记录（买入/卖出时间、类型、仓位变化）
- `dailyStates`: 每日状态（仓位、价值、收益率）
- `yearlyDetails`: 年度详情（买卖金额、利息、收益等）
- `finalValue`: 最终价值
- `totalReturn`: 总收益率
- `annualizedReturn`: 年化收益率
- `maxDrawdown`: 最大回撤

**UI 展示：**
- 在股票买入的时间点上标识红色点，在股票卖出的时间点标识绿色点
- 图表里展示PE 和 市值
- 鼠标移到点位时，展示此时的仓位和价值，以及总价值和相对初始价值的变化百分比，以及收益年化
- 有个单独的卡片展示总收益百分比和年化以及最终的仓位，还有最大回撤
- 卡片内有展示细节按钮，点击则展示每年的计算过程，让用户可以进行校验

---

### 对照组1 - 现金国债
全部持有国债，每月按国债利率计息，利息自动再投入复利。

### 对照组2 - 定投沪深300
全部持有沪深300，通过4年时间每个月定投，直到100%。

---

在最终也有单独的卡片展示他们的最终收益和最大回撤。

