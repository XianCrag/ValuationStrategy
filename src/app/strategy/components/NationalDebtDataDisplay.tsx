'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { StockData, StockConfig } from '../types';
import { formatDate, formatDateShort } from '../utils';

interface NationalDebtDataDisplayProps {
  stock: StockConfig;
  stockData: StockData[];
}

export default function NationalDebtDataDisplay({ stock, stockData }: NationalDebtDataDisplayProps) {
  if (stockData.length === 0) {
    return <p className="text-gray-500">暂无数据</p>;
  }

  const nationalDebtKey = stock.code; // tcm_y10
  const nationalDebtValues = stockData
    .map(item => item[nationalDebtKey] as number)
    .filter((val): val is number => val !== null && val !== undefined);
  
  const nationalDebtMin = nationalDebtValues.length > 0 ? Math.min(...nationalDebtValues) : 0;
  const nationalDebtMax = nationalDebtValues.length > 0 ? Math.max(...nationalDebtValues) : 0;
  const nationalDebtRange = nationalDebtMax - nationalDebtMin;
  const nationalDebtDomain = [
    Math.max(0, nationalDebtMin - nationalDebtRange * 0.1),
    nationalDebtMax + nationalDebtRange * 0.1
  ];

  return (
    <>
      {/* 数据统计 */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-green-900 mb-2">10年期国债收益率 (%)</h3>
          <p className="text-2xl font-bold text-green-600">
            {stockData[stockData.length - 1]?.[nationalDebtKey]?.toFixed(2) || 'N/A'}%
          </p>
        </div>
      </div>

      {/* 国债趋势图 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">10年期国债收益率趋势</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={stockData.map((item) => ({
              date: item.date,
              dateShort: formatDateShort(item.date),
              fullDate: formatDate(item.date),
              nationalDebtRate: item[nationalDebtKey] as number,
            }))}
            margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              angle={-45}
              textAnchor="end"
              height={80}
              interval={Math.floor(stockData.length / 10)}
              tickFormatter={(value) => {
                const item = stockData.find(d => d.date === value);
                return item ? formatDateShort(item.date) : value;
              }}
            />
            <YAxis
              domain={nationalDebtDomain}
              label={{ value: '收益率 (%)', angle: -90, position: 'insideLeft' }}
              tickFormatter={(value) => value.toFixed(2)}
            />
            <Tooltip
              formatter={(value: any) => {
                const numValue = typeof value === 'number' ? value : null;
                return numValue !== null && !isNaN(numValue)
                  ? [`${numValue.toFixed(2)}%`, '收益率']
                  : ['N/A', '收益率'];
              }}
              labelFormatter={(label, payload) => {
                if (payload && payload.length > 0 && payload[0].payload) {
                  const dataPoint = payload[0].payload;
                  if (dataPoint.fullDate) {
                    return `日期: ${dataPoint.fullDate}`;
                  }
                }
                const dataPoint = stockData.find(item => item.date === label);
                return dataPoint ? `日期: ${formatDate(dataPoint.date)}` : `日期: ${label}`;
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="nationalDebtRate"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
              name="10年期国债收益率 (%)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

