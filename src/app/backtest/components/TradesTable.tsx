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
 * 统计每只股票的买卖总和
 */
interface StockTradeSummary {
  code: string;
  name: string;
  totalBuy: number;  // 总买入金额
  totalSell: number; // 总卖出金额
  netChange: number; // 净变化（买入-卖出）
}

function calculateTradeSummary(
  trades: (TradePoint | RebalanceTrade)[],
  getStockName?: (code: string) => string
): StockTradeSummary[] {
  const summaryMap = new Map<string, { totalBuy: number; totalSell: number }>();

  trades.forEach(trade => {
    if (isRebalanceTrade(trade)) {
      // 再平衡交易：对比每只股票的变化
      trade.stockPositions.forEach(pos => {
        const prevPos = trade.prevStockPositions?.find(p => p.code === pos.code);
        const prevValue = prevPos?.value ?? 0;
        const change = pos.value - prevValue;

        if (!summaryMap.has(pos.code)) {
          summaryMap.set(pos.code, { totalBuy: 0, totalSell: 0 });
        }

        const summary = summaryMap.get(pos.code)!;
        if (change > 0) {
          summary.totalBuy += change;
        } else if (change < 0) {
          summary.totalSell += Math.abs(change);
        }
      });
    }
  });

  // 转换为数组并排序
  const summaryArray: StockTradeSummary[] = Array.from(summaryMap.entries()).map(
    ([code, { totalBuy, totalSell }]) => ({
      code,
      name: getStockName ? getStockName(code) : code,
      totalBuy,
      totalSell,
      netChange: totalBuy - totalSell,
    })
  );

  // 按净变化从小到大排序（负数在前，正数在后）
  // 负数 = 卖出多（上涨股票），正数 = 买入多（下跌股票）
  return summaryArray.sort((a, b) => a.netChange - b.netChange);
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

  // 计算交易总结
  const tradeSummary = calculateTradeSummary(trades, getStockName);

  return (
    <div>
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

      {/* 交易总结部分 */}
      {tradeSummary.length > 0 && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="text-md font-semibold mb-3 text-gray-700">交易总结</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tradeSummary.map((summary) => (
              <div
                key={summary.code}
                className="bg-white rounded-md p-3 border border-gray-200 shadow-sm"
              >
                <div className="font-medium text-gray-800 mb-2">{summary.name}</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">总买入：</span>
                    <span className="text-red-600 font-medium">
                      {formatNumber(summary.totalBuy)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">总卖出：</span>
                    <span className="text-green-600 font-medium">
                      {formatNumber(summary.totalSell)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                    <span className="text-gray-700 font-medium">净变化：</span>
                    <span
                      className={`font-semibold ${
                        summary.netChange > 0
                          ? 'text-red-600'
                          : summary.netChange < 0
                          ? 'text-green-600'
                          : 'text-gray-600'
                      }`}
                    >
                      {summary.netChange > 0 ? '+' : ''}
                      {formatNumber(summary.netChange)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* 说明文字 */}
          <div className="mt-4 text-xs text-gray-600 bg-blue-50 p-3 rounded border border-blue-200">
            <span className="font-medium">💡 说明：</span> 
            净变化 = 总买入 - 总卖出。
            <span className="text-green-600 font-medium">负数</span>表示该股票上涨较多，通过再平衡卖出了部分仓位；
            <span className="text-red-600 font-medium">正数</span>表示该股票下跌较多，通过再平衡买入了部分仓位。
          </div>
        </div>
      )}
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
