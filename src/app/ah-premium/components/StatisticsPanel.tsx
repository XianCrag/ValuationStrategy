/**
 * 统计面板组件
 * 显示总股票数、平均溢价率、正/负溢价数量
 */

import { StatisticsPanelProps } from '../types';

export default function StatisticsPanel({ data }: StatisticsPanelProps) {
  if (data.length === 0) return null;

  const avgPremium = data.reduce((sum, item) => sum + item.premium, 0) / data.length;
  const positiveCount = data.filter(item => item.premium > 0).length;
  const negativeCount = data.filter(item => item.premium < 0).length;

  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div>
          <div className="text-sm text-gray-600">总股票数</div>
          <div className="text-2xl font-bold text-gray-900">{data.length}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600">平均溢价率</div>
          <div className="text-2xl font-bold text-blue-600">
            {avgPremium.toFixed(2)}%
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600">正溢价数量</div>
          <div className="text-2xl font-bold text-green-600">
            {positiveCount}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600">负溢价数量</div>
          <div className="text-2xl font-bold text-red-600">
            {negativeCount}
          </div>
        </div>
      </div>
    </div>
  );
}

