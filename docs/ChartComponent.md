# Chart 组件使用文档

## 概述

`ChartContainer` 是一个通用的 LineChart 组件，封装了 Recharts 的常用配置，提供统一的图表展示接口。

## 基本用法

```typescript
import { ChartContainer } from '@/app/components/Chart';

<ChartContainer
  data={chartData}
  lines={[
    {
      dataKey: 'value',
      name: '价值',
      stroke: '#8b5cf6',
      strokeWidth: 3,
    },
  ]}
  title="数据趋势图"
/>
```

## Props 说明

### ChartProps

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `data` | `any[]` | ✅ | - | 图表数据数组 |
| `lines` | `LineConfig[]` | ✅ | - | 线条配置数组 |
| `yAxes` | `YAxisConfig[]` | ❌ | `[{yAxisId: 'left'}]` | Y轴配置 |
| `title` | `string` | ❌ | - | 图表标题 |
| `height` | `number` | ❌ | `400` | 图表高度（px） |
| `xDataKey` | `string` | ❌ | `'date'` | X轴数据字段 |
| `xTickFormatter` | `(value) => string` | ❌ | - | X轴刻度格式化 |
| `xTickInterval` | `number \| 'preserveStartEnd'` | ❌ | `'preserveStartEnd'` | X轴刻度间隔 |
| `tooltipContent` | `React.ReactElement \| Function` | ❌ | - | 自定义Tooltip |
| `legendContent` | `React.ReactElement` | ❌ | - | 自定义图例 |
| `showGrid` | `boolean` | ❌ | `true` | 是否显示网格 |
| `showLegend` | `boolean` | ❌ | `true` | 是否显示图例 |

### LineConfig

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `dataKey` | `string` | ✅ | - | 数据字段名 |
| `name` | `string` | ✅ | - | 线条名称 |
| `stroke` | `string` | ✅ | - | 线条颜色 |
| `strokeWidth` | `number` | ❌ | `2` | 线条宽度 |
| `strokeDasharray` | `string` | ❌ | - | 虚线样式 (如 "5 5") |
| `yAxisId` | `string` | ❌ | `'left'` | Y轴ID |
| `dot` | `boolean \| any` | ❌ | `false` | 是否显示点 |
| `type` | `'monotone' \| 'linear' \| 'step'` | ❌ | `'monotone'` | 线条类型 |
| `isAnimationActive` | `boolean` | ❌ | `false` | 是否启用动画 |

### YAxisConfig

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `yAxisId` | `string` | ✅ | - | Y轴ID（与LineConfig对应） |
| `orientation` | `'left' \| 'right'` | ❌ | `'left'` | Y轴位置 |
| `label` | `string` | ❌ | - | Y轴标签 |
| `domain` | `[number, number] \| ['auto', 'auto']` | ❌ | - | Y轴值域 |
| `hide` | `boolean` | ❌ | `false` | 是否隐藏Y轴 |
| `tickFormatter` | `(value: number) => string` | ❌ | - | 刻度格式化函数 |

## 使用示例

### 1. 单线图

```typescript
<ChartContainer
  data={[
    { date: '2024-01', value: 100 },
    { date: '2024-02', value: 120 },
    { date: '2024-03', value: 115 },
  ]}
  lines={[
    {
      dataKey: 'value',
      name: '价值',
      stroke: '#3b82f6',
      strokeWidth: 2,
    },
  ]}
  title="价值走势"
  xTickFormatter={(date) => date.substring(0, 7)} // 2024-01
/>
```

### 2. 多线图

```typescript
<ChartContainer
  data={chartData}
  lines={[
    {
      dataKey: 'strategyValue',
      name: '策略价值',
      stroke: '#8b5cf6',
      strokeWidth: 3,
    },
    {
      dataKey: 'fundValue',
      name: '基金净值',
      stroke: '#3b82f6',
      strokeWidth: 2,
      strokeDasharray: '5 5', // 虚线
    },
  ]}
  title="策略对比"
/>
```

### 3. 多Y轴图表

```typescript
<ChartContainer
  data={chartData}
  lines={[
    {
      dataKey: 'value',
      name: '策略价值 (万元)',
      stroke: '#8b5cf6',
      strokeWidth: 3,
      yAxisId: 'left',
    },
    {
      dataKey: 'pe',
      name: 'PE TTM',
      stroke: '#3b82f6',
      strokeWidth: 2,
      yAxisId: 'right',
    },
  ]}
  yAxes={[
    {
      yAxisId: 'left',
      orientation: 'left',
      label: '策略价值 (万元)',
      tickFormatter: (value) => value.toFixed(0),
    },
    {
      yAxisId: 'right',
      orientation: 'right',
      label: 'PE TTM',
      tickFormatter: (value) => value.toFixed(1),
    },
  ]}
  title="策略表现与PE趋势"
/>
```

### 4. 自定义 Tooltip

```typescript
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload[0]) return null;
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
      <p className="font-semibold mb-2">日期: {label}</p>
      {payload.map((item: any, index: number) => (
        <p key={index} className="text-sm">
          {item.name}: {item.value.toFixed(2)}
        </p>
      ))}
    </div>
  );
};

<ChartContainer
  data={chartData}
  lines={lines}
  tooltipContent={<CustomTooltip />}
/>
```

### 5. 带交易点标记

```typescript
<ChartContainer
  data={chartData}
  lines={[
    {
      dataKey: 'totalValue',
      name: '策略价值',
      stroke: '#8b5cf6',
      strokeWidth: 3,
      dot: (props: any) => {
        const item = chartData.find(d => d.date === props.payload.date);
        if (item && item.hasTrade) {
          return (
            <circle
              cx={props.cx}
              cy={props.cy}
              r={8}
              fill={item.tradeType === 'buy' ? '#ef4444' : '#10b981'}
              stroke="#fff"
              strokeWidth={2}
            />
          );
        }
        return null;
      },
    },
  ]}
/>
```

### 6. 自定义图例

```typescript
const CustomLegend = () => (
  <div className="mt-4 flex gap-4 justify-center flex-wrap">
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
      <span className="text-sm text-gray-600">策略价值</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 bg-red-500 rounded-full"></div>
      <span className="text-sm text-gray-600">买入点</span>
    </div>
  </div>
);

<ChartContainer
  data={chartData}
  lines={lines}
  showLegend={false}
  legendContent={<CustomLegend />}
/>
```

## 最佳实践

1. **数据优化**: 对于大数据集，使用 `optimizeChartData` 进行数据点优化
2. **颜色选择**: 使用对比明显的颜色便于区分
3. **Y轴数量**: 建议不超过2个Y轴，避免图表过于复杂
4. **Tooltip**: 对于复杂数据，建议自定义Tooltip提供更详细信息
5. **响应式**: 组件已内置 ResponsiveContainer，自动适配容器宽度

## 常用颜色

```typescript
const CHART_COLORS = {
  purple: '#8b5cf6',   // 主要数据
  blue: '#3b82f6',     // 对比数据
  orange: '#f97316',   // 参考数据
  green: '#10b981',    // 正向指标（卖出）
  red: '#ef4444',      // 负向指标（买入）
  gray: '#6b7280',     // 辅助数据
};
```

## 迁移指南

### 从原有代码迁移

**之前**:
```typescript
<ResponsiveContainer width="100%" height={400}>
  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
    <YAxis label={{ value: '价值', angle: -90, position: 'insideLeft' }} />
    <Tooltip />
    <Legend />
    <Line
      type="monotone"
      dataKey="value"
      stroke="#8b5cf6"
      strokeWidth={2}
      dot={false}
      name="价值"
    />
  </LineChart>
</ResponsiveContainer>
```

**现在**:
```typescript
<ChartContainer
  data={chartData}
  lines={[
    {
      dataKey: 'value',
      name: '价值',
      stroke: '#8b5cf6',
      strokeWidth: 2,
    },
  ]}
  yAxes={[
    {
      yAxisId: 'left',
      label: '价值',
    },
  ]}
/>
```

## 注意事项

1. `xDataKey` 默认为 `'date'`，如果数据使用其他字段需显式指定
2. 动画默认关闭以提升性能，如需启用设置 `isAnimationActive: true`
3. 多Y轴时务必为每条线指定正确的 `yAxisId`
4. 自定义 Tooltip 时需自行处理 `active` 和 `payload` 的判断

