# strategy backtesting

### API 对接 ✅

* 对接平台: lixinger
* token: 从本地文件 .env.local 中获取 (参考 LIXINGER_SETUP.md)
* API - list
    * 获取股票数据： https://open.lixinger.com/api/cn/company/fundamental/non_financial
    * 获取指数数据：https://open.lixinger.com/api/cn/index/fundamental
    * 获取ETF基金净值数据：https://open.lixinger.com/api/cn/fund/net-value-of-dividend-reinvestment
    * 国债接口： https://open.lixinger.com/api/macro/national-debt
        * token, startDate, endDate, areaCode(cn, hk, us), metricsList
* 实现状态：
    * ✅ Lixinger API 客户端 (`src/lib/lixinger.ts`)
    * ✅ API 路由 (`/api/lixinger`)
    * ✅ 数据展示页面 (`/strategy`)

### 我关注的标的
1. A股: 沪深300指数 (代码: 000300)
2. 10年期国债 (代码: tcm_y10)

### 我关注的指标
 * [市值, mc]
 * [PE, pe_ttm]

### 策略1 - 股债平衡策略
1. 定期根据相关指数的 PE 调整股票仓位
2. 定期进行股票、债券再平衡



沪深300平衡策略1
1.  PE范围11 - 16, 11的时候股票仓位60%,12则50%， 以此类推，16以上10%。
2.  时间上每6个月review观察一次进行调整。 同时进行股债平衡，让股票保持目标仓位。
3.  债券在年末计算当前平均债券价值的利息。
4.  股债再平衡在股票仓位与目标仓位超过10%的时候进行。
5.  UI 展示
    * 在股票买入的时间点上标识红色点，在股票卖出的时间点标识绿色点。
    * 图表里展示PE 和 市值。
    * 鼠标移到点位时，展示此时的仓位和价值，以及总价值和相对初始价值的变化百分比。以及收益年化。
    * 有个单独的卡片展示总收益百分比和年化以及最终的仓位。还有最大回撤。
    * 卡片内有展示细节按钮，点击则展示每年的计算过程，让用户可以进行校验


对照组1 全部持有国债，按每年末按当年的国债利率分得利息。
对照组2：全部持有沪深300， 通过4年时间每个月定投，直到100%。

在最终也有单独的卡片展示他们的最终收益 和 最大回撤。

