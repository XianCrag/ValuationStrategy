import { MetricType } from '../types';

interface MetricSelectorProps {
  selectedMetric: MetricType;
  onMetricChange: (metric: MetricType) => void;
}

export default function MetricSelector({ selectedMetric, onMetricChange }: MetricSelectorProps) {
  return (
    <div className="flex justify-center gap-4 mb-4">
      <button
        onClick={() => onMetricChange('index')}
        className={`px-6 py-2 rounded-md font-medium transition-colors ${
          selectedMetric === 'index'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        沪深300指数
      </button>
      <button
        onClick={() => onMetricChange('interest')}
        className={`px-6 py-2 rounded-md font-medium transition-colors ${
          selectedMetric === 'interest'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        10年期国债
      </button>
    </div>
  );
}

