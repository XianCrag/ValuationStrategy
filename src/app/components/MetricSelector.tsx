import { MetricType } from '../indicators/types';

interface MetricSelectorProps {
  selectedMetric: MetricType;
  onMetricChange: (metric: MetricType) => void;
}

export default function MetricSelector({ selectedMetric, onMetricChange }: MetricSelectorProps) {
  const metrics = [
    { value: 'csi300-index' as MetricType, label: '沪深300指数' },
    { value: 'csi300-fund' as MetricType, label: '沪深300基金' },
    { value: 'a-stock-all' as MetricType, label: 'A股全指' },
    { value: 'interest' as MetricType, label: '10年期国债' },
    { value: 'erp' as MetricType, label: '股权风险溢价' },
    { value: 'individual-stock' as MetricType, label: '个股指标' },
  ];

  return (
    <div className="flex justify-center gap-3 mb-4 flex-wrap">
      {metrics.map((metric) => (
        <button
          key={metric.value}
          onClick={() => onMetricChange(metric.value)}
          className={`px-6 py-2 rounded-md font-medium transition-colors ${
            selectedMetric === metric.value
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {metric.label}
        </button>
      ))}
    </div>
  );
}

