# strategy backtesting

### API 对接 ✅

* 对接平台: lixinger
* token: 从本地文件 .env.local 中获取 (参考 LIXINGER_SETUP.md)
* API - list
    * 获取股票数据： https://open.lixinger.com/api/cn/company/fundamental/non_financial
    * 获取指数数据：https://open.lixinger.com/api/cn/index/fundamental
    * 获取ETF基金净值数据：https://open.lixinger.com/api/cn/fund/net-value-of-dividend-reinvestment
    * 时间为最近10年
* 实现状态：
    * ✅ Lixinger API 客户端 (`src/lib/lixinger.ts`)
    * ✅ API 路由 (`/api/lixinger`)
    * ✅ 数据展示页面 (`/strategy`)

### 我关注的标的
1. A股: 沪深300指数 (代码: 000300)

### 我关注的指标
 * [市值, mc]
 * [PE, pe_ttm]

### 策略1 - 股债平衡策略

1. 定期根据相关指数的 PE 调整股票仓位
2. 定期进行股票、债券再平衡