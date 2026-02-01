/**
 * 数据加载进度条组件
 * 显示当前加载进度和状态
 */

interface ProgressBarProps {
  current: number;
  total: number;
  message?: string;
}

export default function ProgressBar({ current, total, message }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          {message || '正在加载数据...'}
        </span>
        <span className="text-sm font-medium text-blue-600">
          {current} / {total}
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      <div className="mt-2 text-center">
        <span className="text-lg font-bold text-blue-600">{percentage}%</span>
      </div>
    </div>
  );
}

