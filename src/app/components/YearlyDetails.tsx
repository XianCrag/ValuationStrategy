import { YearlyDetail, StockPosition } from '../backtest/types';
import { formatNumber } from '../backtest/utils';

interface YearlyDetailsTableProps {
  yearlyDetails: YearlyDetail[];
  strategyType: 'cash-bond' | 'dca' | 'strategy';
  showStockPositions?: boolean; // 是否显示详细持仓
}

/**
 * 年度详情表格组件
 * 统一展示不同策略的年度数据，包含股票和现金变化
 */
export function YearlyDetailsTable({ 
  yearlyDetails, 
  strategyType,
  showStockPositions = false 
}: YearlyDetailsTableProps) {
  // 根据策略类型确定显示的列
  const showStockData = strategyType === 'dca' || strategyType === 'strategy';
  const showCashData = strategyType === 'cash-bond' || strategyType === 'dca';
  const showBondData = strategyType === 'strategy';
  const showTradeData = strategyType === 'strategy';

  // 格式化股票持仓
  const formatStockPositions = (positions?: StockPosition[]) => {
    if (!positions || positions.length === 0) return '-';
    return positions.map(p => 
      `${p.code}: ${p.shares.toFixed(0)}份 (${formatNumber(p.value)})`
    ).join(', ');
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10">
              年份
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              年初价值
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              年末价值
            </th>
            
            {/* 股票相关列 */}
            {showStockData && (
              <>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  年初股票
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  年末股票
                </th>
                {showStockPositions && (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      年初持仓
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      年末持仓
                    </th>
                  </>
                )}
                {strategyType === 'dca' && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    定投金额
                  </th>
                )}
                {strategyType === 'strategy' && (
                  <>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      买入股票
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      卖出股票
                    </th>
                  </>
                )}
              </>
            )}
            
            {/* 现金/债券相关列 */}
            {showCashData && (
              <>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  年初现金
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  年末现金
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  现金利息
                </th>
              </>
            )}
            
            {showBondData && (
              <>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  年初债券
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  年末债券
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  买入债券
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  卖出债券
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  债券利息
                </th>
              </>
            )}
            
            {showTradeData && (
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                交易次数
              </th>
            )}
            
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              收益率
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {yearlyDetails.map((year, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                {year.year}
              </td>
              <td className="px-4 py-3 text-sm text-right text-gray-900">
                {formatNumber(year.startValue)}
              </td>
              <td className="px-4 py-3 text-sm text-right text-gray-900">
                {formatNumber(year.endValue)}
              </td>
              
              {/* 股票相关数据 */}
              {showStockData && (
                <>
                  <td className="px-4 py-3 text-sm text-right text-gray-700">
                    {year.startStockValue !== undefined
                      ? formatNumber(year.startStockValue)
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700">
                    {year.endStockValue !== undefined
                      ? formatNumber(year.endStockValue)
                      : '-'}
                  </td>
                  {showStockPositions && (
                    <>
                      <td className="px-4 py-3 text-xs text-left text-gray-600 max-w-xs truncate" title={formatStockPositions(year.startStockPositions)}>
                        {formatStockPositions(year.startStockPositions)}
                      </td>
                      <td className="px-4 py-3 text-xs text-left text-gray-600 max-w-xs truncate" title={formatStockPositions(year.endStockPositions)}>
                        {formatStockPositions(year.endStockPositions)}
                      </td>
                    </>
                  )}
                  {strategyType === 'dca' && (
                    <td className="px-4 py-3 text-sm text-right text-blue-600">
                      {year.investedAmount !== undefined
                        ? `+${formatNumber(year.investedAmount)}`
                        : '-'}
                    </td>
                  )}
                  {strategyType === 'strategy' && (
                    <>
                      <td className="px-4 py-3 text-sm text-right text-green-600">
                        {year.stockBuyAmount !== undefined && year.stockBuyAmount > 0
                          ? `+${formatNumber(year.stockBuyAmount)}`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-red-600">
                        {year.stockSellAmount !== undefined && year.stockSellAmount > 0
                          ? `-${formatNumber(year.stockSellAmount)}`
                          : '-'}
                      </td>
                    </>
                  )}
                </>
              )}
              
              {/* 现金相关数据 */}
              {showCashData && (
                <>
                  <td className="px-4 py-3 text-sm text-right text-gray-700">
                    {year.startCash !== undefined
                      ? formatNumber(year.startCash)
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700">
                    {year.endCash !== undefined
                      ? formatNumber(year.endCash)
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-green-600">
                    {year.cashInterest !== undefined
                      ? `+${formatNumber(year.cashInterest)}`
                      : '-'}
                  </td>
                </>
              )}
              
              {/* 债券相关数据 */}
              {showBondData && (
                <>
                  <td className="px-4 py-3 text-sm text-right text-gray-700">
                    {year.startBondValue !== undefined
                      ? formatNumber(year.startBondValue)
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700">
                    {year.endBondValue !== undefined
                      ? formatNumber(year.endBondValue)
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-green-600">
                    {year.bondBuyAmount !== undefined && year.bondBuyAmount > 0
                      ? `+${formatNumber(year.bondBuyAmount)}`
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-red-600">
                    {year.bondSellAmount !== undefined && year.bondSellAmount > 0
                      ? `-${formatNumber(year.bondSellAmount)}`
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-green-600">
                    {year.bondInterest !== undefined && year.bondInterest > 0
                      ? `+${formatNumber(year.bondInterest)}`
                      : '-'}
                  </td>
                </>
              )}
              
              {/* 交易次数 */}
              {showTradeData && (
                <td className="px-4 py-3 text-sm text-right text-gray-700">
                  {year.trades !== undefined ? year.trades : '-'}
                </td>
              )}
              
              {/* 收益率 */}
              <td className="px-4 py-3 text-sm text-right">
                <span
                  className={
                    year.return >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'
                  }
                >
                  {year.return >= 0 ? '+' : ''}
                  {year.return.toFixed(2)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

