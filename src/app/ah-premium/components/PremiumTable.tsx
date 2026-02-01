/**
 * 溢价表格组件
 * 显示AH股票溢价数据的表格
 */

import { PremiumTableProps } from '../types';

export default function PremiumTable({
  title,
  subtitle,
  data,
  topN,
  colorClass,
  type,
}: PremiumTableProps) {
  const colorMap: Record<string, string> = {
    green: 'bg-green-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
        <span className={`inline-block w-1 h-6 ${colorMap[colorClass]} mr-3`}></span>
        {title} Top {topN}
        <span className="ml-3 text-sm text-gray-500 font-normal">
          {subtitle}
        </span>
      </h2>
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
                行业
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                A股代码
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                H股代码
              </th>
              {type !== 'change' && (
                <>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    A股价格
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    H股价格
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    溢价率
                  </th>
                </>
              )}
              {/* TODO: 30天溢价变化功能 - 待后续开发
              {type === 'change' && (
                <>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    当前溢价率
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    30天变化
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    变化幅度
                  </th>
                </>
              )}
              */}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((item, index) => (
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
                {type !== 'change' && (
                  <>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-mono">
                      ¥{item.aPrice.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-mono">
                      HK${item.hPrice.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span
                        className={`font-bold ${item.premium > 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                      >
                        {item.premium > 0 ? '+' : ''}
                        {item.premium.toFixed(2)}%
                      </span>
                    </td>
                  </>
                )}
                {/* TODO: 30天溢价变化功能 - 待后续开发
                {type === 'change' && (
                  <>
                    <td className="px-4 py-3 text-sm text-right">
                      <span
                        className={`font-bold ${item.premium > 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                      >
                        {item.premium > 0 ? '+' : ''}
                        {item.premium.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span
                        className={`font-bold ${item.premiumChange30d! > 0
                          ? 'text-green-600'
                          : 'text-red-600'
                          }`}
                      >
                        {item.premiumChange30d! > 0 ? '+' : ''}
                        {item.premiumChange30d!.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className="font-bold text-purple-600">
                        {Math.abs(item.premiumChange30d!).toFixed(2)}%
                      </span>
                    </td>
                  </>
                )}
                */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

