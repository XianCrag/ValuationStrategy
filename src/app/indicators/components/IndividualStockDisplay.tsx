'use client';

import { useState } from 'react';
import { StockConfig } from '@/constants/stocks';
import { formatNumber, formatDate, formatDateShort } from '../utils';
import { ChartContainer } from '../../components/Chart';
import { useIndividualStockData } from '../hooks/useIndividualStockData';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorDisplay from '../../components/Error';

interface IndividualStockDisplayProps {
  availableStocks: StockConfig[];
  years: number; // 年限参数
}

export default function IndividualStockDisplay({ 
  availableStocks,
  years
}: IndividualStockDisplayProps) {
  const [selectedStockCode, setSelectedStockCode] = useState<string>(
    availableStocks.length > 0 ? availableStocks[0].code : ''
  );

  // 使用新的 hook 按需加载单个股票数据
  const { data: stockData, loading, error, refetch } = useIndividualStockData(selectedStockCode, years);

  const selectedStock = availableStocks.find(s => s.code === selectedStockCode);

  // 按行业分组股票
  const stocksByIndustry: Record<string, StockConfig[]> = {};
  availableStocks.forEach(stock => {
    const industry = stock.industry || '其他';
    if (!stocksByIndustry[industry]) {
      stocksByIndustry[industry] = [];
    }
    stocksByIndustry[industry].push(stock);
  });

  if (availableStocks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">个股指标</h2>
        <p className="text-gray-500">暂无可用的股票数据</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">个股指标</h2>
        
        {/* 股票选择器 */}
        <div className="flex items-center gap-4">
          <label htmlFor="stock-select" className="text-sm font-medium text-gray-700">
            选择股票：
          </label>
          <select
            id="stock-select"
            value={selectedStockCode}
            onChange={(e) => setSelectedStockCode(e.target.value)}
            className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            {Object.entries(stocksByIndustry).map(([industry, stocks]) => (
              <optgroup key={industry} label={industry}>
                {stocks.map((stock) => (
                  <option key={stock.code} value={stock.code}>
                    {stock.name} ({stock.code})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorDisplay error={error} onRetry={refetch} />
      ) : stockData.length === 0 ? (
        <p className="text-gray-500">暂无数据</p>
      ) : (
        <>
          {/* 数据统计 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-green-900 mb-2">PE TTM</h3>
              <p className="text-2xl font-bold text-green-600">
                {stockData[stockData.length - 1]?.pe_ttm?.toFixed(2) || 'N/A'}
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">总市值</h3>
              <p className="text-2xl font-bold text-blue-600">
                {formatNumber(stockData[stockData.length - 1]?.mc)}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-purple-900 mb-2">股息率</h3>
              <p className="text-2xl font-bold text-purple-600">
                {stockData[stockData.length - 1]?.dyr 
                  ? `${(stockData[stockData.length - 1].dyr * 100).toFixed(2)}%` 
                  : 'N/A'}
              </p>
            </div>
          </div>

          {/* 合并趋势图 */}
          <ChartContainer
            data={stockData.map((item) => {
              // 判断市值是否需要使用万亿单位
              const rawMarketCapValues = stockData
                .map(d => d.mc)
                .filter((val): val is number => val !== null && val !== undefined);
              const maxMarketCap = rawMarketCapValues.length > 0 ? Math.max(...rawMarketCapValues) : 0;
              const useTrillion = maxMarketCap >= 1000000000000; // 大于等于1万亿
              const marketCapDivisor = useTrillion ? 1000000000000 : 100000000;
              
              return {
                date: item.date,
                dateShort: formatDateShort(item.date),
                fullDate: formatDate(item.date),
                peTtm: item.pe_ttm,
                marketCap: item.mc ? item.mc / marketCapDivisor : null,
                rawMarketCap: item.mc,
                dividendYield: item.dyr ? item.dyr * 100 : null, // 转换为百分比
                useTrillion,
              };
            })}
            lines={[
              {
                dataKey: 'peTtm',
                name: 'PE TTM',
                stroke: '#10b981',
                strokeWidth: 2,
                yAxisId: 'left',
              },
              {
                dataKey: 'marketCap',
                name: '总市值',
                stroke: '#3b82f6',
                strokeWidth: 2,
                yAxisId: 'right',
              },
              {
                dataKey: 'dividendYield',
                name: '股息率 (%)',
                stroke: '#a855f7',
                strokeWidth: 2,
                yAxisId: 'left',
              },
            ]}
            yAxes={[
              {
                yAxisId: 'left',
                orientation: 'left',
                label: 'PE TTM / 股息率 (%)',
                tickFormatter: (value) => value.toFixed(2),
              },
              {
                yAxisId: 'right',
                orientation: 'right',
                label: `总市值 (${stockData.length > 0 && stockData[0] && 'useTrillion' in stockData[0] ? '万亿' : '亿'})`,
                tickFormatter: (value) => value.toFixed(2),
              },
            ]}
            title={`${selectedStock?.name || ''} - PE TTM、总市值与股息率趋势`}
            xTickFormatter={(value) => {
              const item = stockData.find(d => d.date === value);
              return item ? formatDateShort(item.date) : value;
            }}
            xTickInterval={Math.floor(stockData.length / 10)}
            tooltipContent={(props: any) => {
              const { active, payload, label } = props;
              if (!active || !payload || payload.length === 0) return null;
              
              const dataPoint = payload[0].payload;
              const fullDate = dataPoint?.fullDate || formatDate(label);
              
              return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                  <p className="font-semibold mb-2">日期: {fullDate}</p>
                  {payload.map((item: any, index: number) => {
                    if (item.dataKey === 'peTtm') {
                      const numValue = typeof item.value === 'number' ? item.value : null;
                      return (
                        <p key={index} className="text-sm mb-1">
                          PE TTM: {numValue !== null && !isNaN(numValue) ? numValue.toFixed(2) : 'N/A'}
                        </p>
                      );
                    }
                    if (item.dataKey === 'marketCap') {
                      const rawValue = dataPoint?.rawMarketCap;
                      return (
                        <p key={index} className="text-sm mb-1">
                          总市值: {rawValue ? formatNumber(rawValue) : 'N/A'}
                        </p>
                      );
                    }
                    if (item.dataKey === 'dividendYield') {
                      const numValue = typeof item.value === 'number' ? item.value : null;
                      return (
                        <p key={index} className="text-sm">
                          股息率: {numValue !== null && !isNaN(numValue) ? `${numValue.toFixed(2)}%` : 'N/A'}
                        </p>
                      );
                    }
                    return null;
                  })}
                </div>
              );
            }}
          />
        </>
      )}
    </div>
  );
}

