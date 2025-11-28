import { formatNumber } from '../utils';

interface ChartTooltipProps {
  active?: boolean;
  payload?: readonly any[];
  label?: string | number;
  chartData: any[];
}

export function StockBondChartTooltip({ active, payload, label, chartData }: ChartTooltipProps) {
  if (!active || !payload || !payload[0]) return null;
  
  const item = chartData.find(d => d.date === String(label));
  if (!item) return null;
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
      <p className="font-semibold mb-2">{`日期: ${item.dateShort}`}</p>
      <p className="text-sm mb-1">
        <span className="font-medium">策略总价值:</span> {formatNumber(item.totalValue)}
      </p>
      <p className="text-sm mb-1">
        <span className="font-medium">沪深300指数:</span> {item.indexPrice?.toFixed(2) || 'N/A'}
      </p>
      <p className="text-sm mb-1">
        <span className="font-medium">PE TTM:</span> {item.pe?.toFixed(2) || 'N/A'}
      </p>
      {item.hasTrade && (
        <p className="text-sm mb-1">
          <span className="font-medium">交易类型:</span>{' '}
          <span className={item.tradeType === 'buy' ? 'text-red-600' : 'text-green-600'}>
            {item.tradeType === 'buy' ? '买入股票' : '卖出股票'}
          </span>
        </p>
      )}
      <div className="border-t border-gray-200 mt-2 pt-2">
        <p className="text-sm font-medium mb-1">策略状态:</p>
        <p className="text-sm mb-1">
          <span className="font-medium">仓位:</span> 股票 {(item.stockRatio * 100).toFixed(1)}% / 债券 {(item.bondRatio * 100).toFixed(1)}%
        </p>
        <p className="text-sm mb-1">
          <span className="font-medium">股票价值:</span> {formatNumber(item.stockValue)}
        </p>
        <p className="text-sm mb-1">
          <span className="font-medium">债券价值:</span> {formatNumber(item.bondValue)}
        </p>
        <p className="text-sm mb-1">
          <span className="font-medium">相对初始价值变化:</span>{' '}
          <span className={item.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}>
            {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
          </span>
        </p>
        <p className="text-sm">
          <span className="font-medium">年化收益率:</span>{' '}
          <span className={item.annualizedReturn >= 0 ? 'text-green-600' : 'text-red-600'}>
            {item.annualizedReturn >= 0 ? '+' : ''}{item.annualizedReturn.toFixed(2)}%
          </span>
        </p>
      </div>
    </div>
  );
}

export function ChartLegend() {
  return (
    <div className="mt-4 flex gap-4 justify-center flex-wrap">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
        <span className="text-sm text-gray-600">策略价值</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-1 bg-orange-500" style={{ width: '20px', height: '4px' }}></div>
        <span className="text-sm text-gray-600">沪深300指数</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
        <span className="text-sm text-gray-600">PE指标</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-red-500 rounded-full"></div>
        <span className="text-sm text-gray-600">买入点</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-green-500 rounded-full"></div>
        <span className="text-sm text-gray-600">卖出点</span>
      </div>
    </div>
  );
}

