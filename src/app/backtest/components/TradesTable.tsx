import { TradePoint, RebalanceTrade } from '../types';
import { formatNumber, formatDateShort } from '../utils';

interface TradesTableProps {
  trades: TradePoint[] | RebalanceTrade[];
  getStockName?: (code: string) => string;
}

/**
 * 检查是否为策略交易
 */
function isTradePoint(trade: TradePoint | RebalanceTrade): trade is TradePoint {
  return 'stockRatio' in trade && 'bondValue' in trade;
}

/**
 * 检查是否为再平衡交易
 */
function isRebalanceTrade(trade: TradePoint | RebalanceTrade): trade is RebalanceTrade {
  return 'stockPositions' in trade && 'cashValue' in trade;
}

/**
 * 通用交易记录表格组件
 * 自动识别交易类型并渲染相应的内容
 * 支持多策略动态列展示
 */
export default function TradesTable({ trades, getStockName }: TradesTableProps) {
  if (trades.length === 0) {
    return <div className="text-gray-500 text-sm">暂无交易记录</div>;
  }

  // 识别交易中包含的策略类型
  const hasStrategyTrade = trades.some(t => isTradePoint(t));
  const hasRebalanceTrade = trades.some(t => isRebalanceTrade(t));

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 border">日期</th>
            {hasStrategyTrade && (
              <th className="px-4 py-2 border">股债平衡策略</th>
            )}
            {hasRebalanceTrade && (
              <th className="px-4 py-2 border">再平衡策略</th>
            )}
            <th className="px-4 py-2 border">总价值</th>
            <th className="px-4 py-2 border">累计收益率</th>
            <th className="px-4 py-2 border">年化收益率</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade, index) => {
            return (
              <tr key={index} className="hover:bg-gray-50">
                {/* 日期 */}
                <td className="px-4 py-2 border text-sm whitespace-nowrap align-top">
                  {formatDateShort(trade.date)}
                </td>

                {/* 股债平衡策略列 */}
                {hasStrategyTrade && (
                  <td className="px-4 py-2 border text-sm align-top">
                    {isTradePoint(trade) ? (
                      <div>
                        {/* 策略标题 - 第一行 */}
                        <div className="mb-2 font-medium">
                          <span className={trade.type === 'buy' ? 'text-red-600' : 'text-green-600'}>
                            【{trade.type === 'buy' ? '买入股票' : '卖出股票'}】
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            仓位调整至 {(trade.stockRatio * 100).toFixed(1)}%
                          </span>
                        </div>
                        {/* 仓位变化 */}
                        <div className="space-y-1">
                          <PositionItem
                            label="股票"
                            currentValue={trade.stockValue}
                            prevValue={null}
                          />
                          <PositionItem
                            label="债券"
                            currentValue={trade.bondValue}
                            prevValue={null}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 text-center">-</div>
                    )}
                  </td>
                )}

                {/* 再平衡策略列 */}
                {hasRebalanceTrade && (
                  <td className="px-4 py-2 border text-sm align-top">
                    {isRebalanceTrade(trade) ? (
                      <div>
                        {/* 策略标题 - 第一行 */}
                        <div className="mb-2 font-medium">
                          <span className="text-blue-600">【再平衡】</span>
                          <span className="text-xs text-gray-500 ml-2">
                            调整至目标仓位
                          </span>
                        </div>
                        {/* 仓位变化 */}
                        <div className="space-y-1.5">
                          {trade.stockPositions.map((pos, idx) => {
                            // 使用再平衡前的仓位进行对比
                            const prevPos = trade.prevStockPositions?.find(p => p.code === pos.code);
                            
                            return (
                              <PositionItem
                                key={idx}
                                label={`${getStockName ? getStockName(pos.code) : pos.code} (${(pos.ratio * 100).toFixed(1)}%)`}
                                currentValue={pos.value}
                                prevValue={prevPos?.value ?? null}
                                stockPrice={pos.price}
                              />
                            );
                          })}
                          <PositionItem
                            label="现金"
                            currentValue={trade.cashValue}
                            prevValue={trade.prevCashValue ?? null}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 text-center">-</div>
                    )}
                  </td>
                )}

                {/* 总价值 */}
                <td className="px-4 py-2 border text-sm text-right whitespace-nowrap align-top">
                  {formatNumber(trade.totalValue)}
                </td>

                {/* 累计收益率 */}
                <td className="px-4 py-2 border text-sm text-right whitespace-nowrap align-top">
                  <span className={trade.changePercent >= 0 ? 'text-red-600' : 'text-green-600'}>
                    {trade.changePercent >= 0 ? '+' : ''}{trade.changePercent.toFixed(2)}%
                  </span>
                </td>

                {/* 年化收益率 */}
                <td className="px-4 py-2 border text-sm text-right whitespace-nowrap align-top">
                  <span className={trade.annualizedReturn >= 0 ? 'text-red-600' : 'text-green-600'}>
                    {trade.annualizedReturn >= 0 ? '+' : ''}{trade.annualizedReturn.toFixed(2)}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * 仓位项组件 - 显示单个仓位及其变化
 */
function PositionItem({
  label,
  currentValue,
  prevValue,
  stockPrice,
}: {
  label: string;
  currentValue: number;
  prevValue: number | null;
  stockPrice?: number;
}) {
  const change = prevValue !== null ? currentValue - prevValue : null;
  const changePercent = prevValue !== null && prevValue !== 0 ? ((currentValue - prevValue) / prevValue) * 100 : null;

  return (
    <div className="flex items-center justify-between text-xs">
      <span 
        className="text-gray-600 font-medium relative group cursor-help"
        title={stockPrice ? `股价: ¥${stockPrice.toFixed(2)}` : undefined}
      >
        {label}
        {stockPrice && (
          <span className="absolute left-0 bottom-full mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
            股价: ¥{stockPrice.toFixed(2)}
          </span>
        )}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-gray-900">{formatNumber(currentValue)}</span>
        {change !== null && change !== 0 && (
          <span className={`text-xs font-medium ${change > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {change > 0 ? '↑' : '↓'} {formatNumber(Math.abs(change))}
            {changePercent !== null && ` (${change > 0 ? '+' : ''}${changePercent.toFixed(1)}%)`}
          </span>
        )}
      </div>
    </div>
  );
}
