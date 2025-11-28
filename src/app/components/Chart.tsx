/**
 * 通用 LineChart 组件
 * 封装 Recharts LineChart 的常用配置
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export interface LineConfig {
  /** 数据字段名 */
  dataKey: string;
  /** 线条名称（显示在图例中） */
  name: string;
  /** 线条颜色 */
  stroke: string;
  /** 线条宽度 */
  strokeWidth?: number;
  /** 是否显示虚线 */
  strokeDasharray?: string;
  /** Y轴ID（用于多Y轴） */
  yAxisId?: string;
  /** 是否显示点 */
  dot?: boolean | any;
  /** 线条类型 */
  type?: 'monotone' | 'linear' | 'step';
  /** 是否启用动画 */
  isAnimationActive?: boolean;
}

export interface YAxisConfig {
  /** Y轴ID */
  yAxisId: string;
  /** Y轴方向 */
  orientation?: 'left' | 'right';
  /** Y轴标签 */
  label?: string;
  /** Y轴值域 */
  domain?: [number, number] | ['auto', 'auto'] | ['dataMin', 'dataMax'];
  /** 是否隐藏 */
  hide?: boolean;
  /** 刻度格式化函数 */
  tickFormatter?: (value: number) => string;
}

export interface ChartProps {
  /** 图表数据 */
  data: any[];
  /** 线条配置 */
  lines: LineConfig[];
  /** Y轴配置 */
  yAxes?: YAxisConfig[];
  /** 图表标题 */
  title?: string;
  /** 图表高度 */
  height?: number;
  /** X轴数据字段 */
  xDataKey?: string;
  /** X轴刻度格式化函数 */
  xTickFormatter?: (value: any) => string;
  /** X轴刻度间隔 */
  xTickInterval?: number | 'preserveStart' | 'preserveEnd' | 'preserveStartEnd';
  /** Tooltip 自定义内容 */
  tooltipContent?: React.ReactElement | ((props: any) => React.ReactElement | null);
  /** 自定义图例 */
  legendContent?: React.ReactElement;
  /** 是否显示网格 */
  showGrid?: boolean;
  /** 是否显示图例 */
  showLegend?: boolean;
}

export function ChartContainer({
  data,
  lines,
  yAxes = [{ yAxisId: 'left', orientation: 'left' }],
  title,
  height = 400,
  xDataKey = 'date',
  xTickFormatter,
  xTickInterval = 'preserveStartEnd',
  tooltipContent,
  legendContent,
  showGrid = true,
  showLegend = true,
}: ChartProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      {title && <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          
          <XAxis
            dataKey={xDataKey}
            angle={-45}
            textAnchor="end"
            height={80}
            interval={xTickInterval}
            tickFormatter={xTickFormatter}
          />
          
          {yAxes.map((yAxis) => (
            <YAxis
              key={yAxis.yAxisId}
              yAxisId={yAxis.yAxisId}
              orientation={yAxis.orientation || 'left'}
              domain={yAxis.domain}
              hide={yAxis.hide}
              label={
                yAxis.label
                  ? {
                      value: yAxis.label,
                      angle: yAxis.orientation === 'right' ? 90 : -90,
                      position: yAxis.orientation === 'right' ? 'insideRight' : 'insideLeft',
                    }
                  : undefined
              }
              tickFormatter={yAxis.tickFormatter}
            />
          ))}
          
          {tooltipContent ? (
            typeof tooltipContent === 'function' ? (
              <Tooltip content={tooltipContent} />
            ) : (
              <Tooltip content={() => tooltipContent} />
            )
          ) : (
            <Tooltip />
          )}
          
          {showLegend && <Legend />}
          
          {lines.map((line) => (
            <Line
              key={line.dataKey}
              yAxisId={line.yAxisId || 'left'}
              type={line.type || 'monotone'}
              dataKey={line.dataKey}
              name={line.name}
              stroke={line.stroke}
              strokeWidth={line.strokeWidth || 2}
              strokeDasharray={line.strokeDasharray}
              dot={line.dot !== undefined ? line.dot : false}
              activeDot={{ r: 6 }}
              isAnimationActive={line.isAnimationActive !== undefined ? line.isAnimationActive : false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      
      {legendContent && legendContent}
    </div>
  );
}

