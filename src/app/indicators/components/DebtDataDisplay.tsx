'use client';

import { StockData } from '../types';
import { StockConfig } from '@/constants/stocks';
import { formatDate, formatDateShort } from '../utils';
import { ChartContainer } from '../../components/Chart';

interface NationalDebtDataDisplayProps {
  stock: StockConfig;
  stockData: StockData[];
}

export default function NationalDebtDataDisplay({ stock, stockData }: NationalDebtDataDisplayProps) {
  if (stockData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">{stock.name}</h2>
        <p className="text-gray-500">暂无数据</p>
      </div>
    );
  }

  const nationalDebtKey = stock.code; // tcm_y10
  const nationalDebtValues = stockData
    .map(item => item[nationalDebtKey] as number)
    .filter((val): val is number => val !== null && val !== undefined);
  
  const nationalDebtMin = nationalDebtValues.length > 0 ? Math.min(...nationalDebtValues) : 0;
  const nationalDebtMax = nationalDebtValues.length > 0 ? Math.max(...nationalDebtValues) : 0;
  const nationalDebtRange = nationalDebtMax - nationalDebtMin;
  const nationalDebtDomain: [number, number] = [
    Math.max(0, nationalDebtMin - nationalDebtRange * 0.1),
    nationalDebtMax + nationalDebtRange * 0.1
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">{stock.name}</h2>
      
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
      <ChartContainer
        data={stockData.map((item) => ({
          date: item.date,
          dateShort: formatDateShort(item.date),
          fullDate: formatDate(item.date),
          nationalDebtRate: item[nationalDebtKey] as number,
        }))}
        lines={[
          {
            dataKey: 'nationalDebtRate',
            name: '10年期国债收益率 (%)',
            stroke: '#10b981',
            strokeWidth: 2,
          },
        ]}
        yAxes={[
          {
            yAxisId: 'left',
            label: '收益率 (%)',
            domain: nationalDebtDomain,
            tickFormatter: (value) => value.toFixed(2),
          },
        ]}
        title="10年期国债收益率趋势"
        xTickFormatter={(value) => {
          const item = stockData.find(d => d.date === value);
          return item ? formatDateShort(item.date) : value;
        }}
        tooltipContent={(props: any) => {
          const { active, payload, label } = props;
          if (!active || !payload || !payload[0]) return null;
          
          const dataPoint = stockData.find(item => item.date === label);
          const fullDate = dataPoint ? formatDate(dataPoint.date) : label;
          const numValue = typeof payload[0].value === 'number' ? payload[0].value : null;
          
          return (
            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
              <p className="font-semibold mb-1">日期: {fullDate}</p>
              <p className="text-sm">
                收益率: {numValue !== null && !isNaN(numValue) ? `${numValue.toFixed(2)}%` : 'N/A'}
              </p>
            </div>
          );
        }}
      />
    </div>
  );
}

