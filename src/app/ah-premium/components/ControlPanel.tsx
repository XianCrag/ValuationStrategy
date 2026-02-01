/**
 * 控制面板组件
 * 包含行业筛选器和获取数据按钮
 */

import { ControlPanelProps } from '../types';

export default function ControlPanel({
  selectedIndustry,
  industries,
  loading,
  onIndustryChange,
  onRefresh,
}: ControlPanelProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* 分类筛选 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          分类筛选
        </label>
        <select
          value={selectedIndustry}
          onChange={(e) => onIndustryChange(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="全部">全部分类</option>
          {industries.map(industry => (
            <option key={industry} value={industry}>
              {industry}
            </option>
          ))}
        </select>
      </div>

      {/* 获取数据按钮 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          数据操作
        </label>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '加载中...' : '获取数据'}
        </button>
      </div>
    </div>
  );
}

