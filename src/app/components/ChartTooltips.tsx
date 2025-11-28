import { formatNumber } from '../backtest/utils';

interface BaseTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

interface TooltipField {
  label: string;
  value: string | number;
  format?: 'number' | 'currency' | 'percent' | 'decimal';
  decimals?: number;
  className?: string;
}

interface SimpleTooltipProps extends BaseTooltipProps {
  /** 日期字段名 */
  dateKey?: string;
  /** 值字段名 */
  valueKey: string;
  /** 值标签 */
  valueLabel: string;
  /** 格式化函数 */
  formatter?: (value: number) => string;
}

interface MultiFieldTooltipProps extends BaseTooltipProps {
  /** 日期字段名 */
  dateKey?: string;
  /** 字段配置 */
  fields: TooltipField[];
}

/**
 * 格式化字段值
 */
function formatFieldValue(value: any, format?: string, decimals = 2): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return 'N/A';
  }

  const numValue = Number(value);

  switch (format) {
    case 'number':
      return formatNumber(numValue);
    case 'currency':
      return formatNumber(numValue);
    case 'percent':
      return `${numValue.toFixed(decimals)}%`;
    case 'decimal':
      return numValue.toFixed(decimals);
    default:
      return String(value);
  }
}

/**
 * 简单Tooltip - 单个值展示
 */
export function SimpleTooltip({
  active,
  payload,
  label,
  dateKey = 'date',
  valueKey,
  valueLabel,
  formatter,
}: SimpleTooltipProps) {
  if (!active || !payload || !payload[0]) return null;

  const data = payload[0].payload;
  const displayDate = data[dateKey] || label;
  const value = payload[0].value;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
      <p className="font-semibold mb-1">日期: {displayDate}</p>
      <p className="text-sm">
        {valueLabel}: {formatter ? formatter(value) : value}
      </p>
    </div>
  );
}

/**
 * 多字段Tooltip - 显示多个字段
 */
export function MultiFieldTooltip({
  active,
  payload,
  label,
  dateKey = 'dateShort',
  fields,
}: MultiFieldTooltipProps) {
  if (!active || !payload || !payload[0]) return null;

  const data = payload[0].payload;
  const displayDate = data[dateKey] || label;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
      <p className="font-semibold mb-2">日期: {displayDate}</p>
      {fields.map((field, index) => {
        const value = field.value !== undefined ? field.value : data[field.label];
        const displayValue = formatFieldValue(value, field.format, field.decimals);
        
        return (
          <p key={index} className={`text-sm mb-1 ${field.className || ''}`}>
            <span className="font-medium">{field.label}:</span> {displayValue}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Recharts Tooltip - 自动处理payload数组
 */
export function ChartTooltip({
  active,
  payload,
  label,
  dateKey = 'dateShort',
  formatters,
}: BaseTooltipProps & {
  dateKey?: string;
  formatters?: Record<string, (value: number) => string>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  const displayDate = data[dateKey] || label;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
      <p className="font-semibold mb-2">日期: {displayDate}</p>
      {payload.map((item: any, index: number) => {
        const formatter = formatters?.[item.dataKey];
        const displayValue = formatter ? formatter(item.value) : item.value;
        
        return (
          <p key={index} className="text-sm mb-1">
            <span className="font-medium">{item.name}:</span>{' '}
            {typeof displayValue === 'number' ? displayValue.toFixed(2) : displayValue}
          </p>
        );
      })}
    </div>
  );
}

/**
 * 通用Tooltip容器
 */
export function TooltipContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
      {children}
    </div>
  );
}

/**
 * Tooltip标题
 */
export function TooltipTitle({ date }: { date: string }) {
  return <p className="font-semibold mb-2">日期: {date}</p>;
}

/**
 * Tooltip字段行
 */
export function TooltipField({ label, value, className }: {
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <p className={`text-sm mb-1 ${className || ''}`}>
      <span className="font-medium">{label}:</span> {value}
    </p>
  );
}

