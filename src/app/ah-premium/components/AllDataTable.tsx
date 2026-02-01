/**
 * 完整数据表格组件
 * 显示所有AH股票溢价数据，支持按溢价率排序
 */

import { useState } from 'react';
import { AHPremiumData } from '../types';

interface AllDataTableProps {
  data: AHPremiumData[];
}

type SortOrder = 'desc' | 'asc' | 'none';

export default function AllDataTable({ data }: AllDataTableProps) {
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // 根据排序顺序处理数据
  const sortedData = [...data].sort((a, b) => {
    if (sortOrder === 'desc') {
      return b.premium - a.premium; // 降序：从高到低
    } else if (sortOrder === 'asc') {
      return a.premium - b.premium; // 升序：从低到高
    }
    return 0; // 不排序
  });

  // 切换排序顺序
  const toggleSort = () => {
    if (sortOrder === 'desc') {
      setSortOrder('asc');
    } else if (sortOrder === 'asc') {
      setSortOrder('none');
    } else {
      setSortOrder('desc');
    }
  };

  // 排序图标
  const getSortIcon = () => {
    if (sortOrder === 'desc') return '↓';
    if (sortOrder === 'asc') return '↑';
    return '↕';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900">
          AH溢价数据
          <span className="ml-3 text-sm text-gray-500 font-normal">
            共 {data.length} 只股票
          </span>
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                排名
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                股票名称
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                分类
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                A股代码
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                H股代码
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                A股价格
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                H股价格
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                <button
                  onClick={toggleSort}
                  className="flex items-center justify-end w-full hover:text-gray-700 transition-colors"
                  title="点击切换排序"
                >
                  溢价率 {getSortIcon()}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedData.map((item, index) => (
              <tr key={item.aCode} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {index + 1}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                  {item.name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {item.industry}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                  {item.aCode}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                  {item.hCode}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right font-mono">
                  ¥{item.aPrice.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right font-mono">
                  HK${item.hPrice.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  <span
                    className={`font-bold ${
                      item.premium > 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {item.premium > 0 ? '+' : ''}
                    {item.premium.toFixed(2)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-gray-500 flex items-center justify-between">
        <div>
          点击&ldquo;溢价率&rdquo;列标题可切换排序方式
        </div>
        <div>
          {sortOrder === 'desc' && '当前：溢价从高到低'}
          {sortOrder === 'asc' && '当前：溢价从低到高'}
          {sortOrder === 'none' && '当前：不排序'}
        </div>
      </div>
    </div>
  );
}

