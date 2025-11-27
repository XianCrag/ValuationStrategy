# 定投策略功能更新说明

## 📋 更新内容

### 1. 使用基金代替指数

**变更：** 将沪深300指数（000300）改为沪深300指数基金（510300）

**原因：**
- ✅ **复权净值**：基金的复权净值已考虑分红再投资，更准确反映实际投资收益
- ✅ **可交易性**：ETF基金是可以实际交易的产品，更贴近真实投资场景
- ✅ **费用考虑**：基金净值已包含管理费等成本，更接近真实收益

**技术实现：**
- 新增 `src/lib/lixinger/fund.ts` - 基金数据获取模块
- API 支持 `type: 'fund'` 类型
- 服务器端自动处理分批请求

### 2. 统一代码常量管理

**目的：** 避免硬编码，便于维护和修改

**常量文件：** `src/app/strategy/backtest/constants.ts`

```typescript
// 标的代码常量
export const CSI300_FUND_CODE = '510300';  // 沪深300指数基金
export const TCM_Y10_CODE = 'tcm_y10';     // 10年期国债

// 回测参数常量
export const INITIAL_CAPITAL = 1000000;    // 初始资金
export const DCA_MONTHS = 48;              // 定投月数
export const DATA_YEARS = 20;              // 数据年限（默认）
```

**更新的文件：**
- ✅ `dca-csi300/page.tsx`
- ✅ `cash-bond/page.tsx`
- ✅ `backtest/page.tsx`
- ✅ `calculateControlGroup2.ts`
- ✅ `fetch-test-data.ts`
- ✅ `constants.ts`

### 3. 年限选择器UI

**功能：** 用户可以自定义投资时长

**默认值：** 10年（而非硬编码20年）

**选项：**
- 5年
- 10年（默认）
- 15年
- 20年

**实现：**
```typescript
const [years, setYears] = useState(10); // 默认10年

useEffect(() => {
  fetchData();
}, [years]); // 当年限改变时重新获取数据
```

### 4. 价值变化折线图

**展示内容：**
1. **定投策略总价值**（蓝线）：48个月定投完成的实际收益曲线
2. **一次性买入基金**（绿线）：用相同本金一次性买入的对比曲线

**图表特性：**
- 响应式设计
- 自动缩放
- 悬停显示详细数据
- X轴：日期（自动间隔）
- Y轴：价值（万元）

**实现：**
```typescript
const chartData = result && stockData.length > 0 ? result.dailyValues.map((daily, index) => {
  const fundPrice = stockData.find(s => s.date === daily.date)?.cp || 0;
  const initialFundPrice = stockData[0]?.cp || 1;
  
  return {
    date: daily.date,
    dateShort: formatDateShort(daily.date),
    strategyValue: daily.value,              // 定投策略价值
    fundValue: (fundPrice / initialFundPrice) * INITIAL_CAPITAL, // 一次性买入价值
  };
}) : [];
```

**对比说明：**
- 蓝线 vs 绿线 可直观对比定投和一次性投资的收益差异
- 定投策略在下跌市场中通常表现更优（平滑成本）
- 上涨市场中一次性买入通常收益更高

## 📊 页面效果

### 顶部：年限选择器
```
投资时长：[下拉选择] 5年 / 10年 / 15年 / 20年
```

### 中部：策略结果卡片
```
总收益率 | 年化收益率 | 最终价值 | 最大回撤
```

### 折线图：价值变化对比
```
━━━━━ 定投策略总价值（蓝线）
━━━━━ 一次性买入基金（绿线）
```

### 底部：年度详情表格
```
年份 | 年初价值 | 年末价值 | 股票价值 | 定投金额 | 现金 | 收益率
```

## 🔧 技术栈

- **图表库：** Recharts
- **数据获取：** Next.js API Routes（服务器端处理分批）
- **状态管理：** React useState + useEffect
- **样式：** Tailwind CSS
- **类型安全：** TypeScript

## ✅ 测试状态

所有 101 个测试通过 ✓
无 Lint 错误 ✓

## 🚀 使用方法

1. 访问 `/strategy/backtest/dca-csi300`
2. 选择投资时长（5/10/15/20年）
3. 查看策略结果和折线图对比
4. 展开年度详情查看详细数据

## 📝 注意事项

1. **数据来源：** 理杏仁开放API（基金复权净值）
2. **分批请求：** 超过10年数据由服务器端自动分批获取
3. **实时数据：** 每次切换年限会重新获取最新数据
4. **性能优化：** 图表数据自动抽样显示，避免渲染过多点

