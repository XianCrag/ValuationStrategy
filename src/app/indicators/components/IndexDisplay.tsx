'use client';

import { StockData } from '../types';
import { StockConfig } from '@/constants/stocks';
import { formatNumber, formatDate, formatDateShort } from '../utils';
import { ChartContainer } from '../../components/Chart';

interface IndexDataDisplayProps {
  stock: StockConfig;
  stockData: StockData[];
}

export default function IndexDataDisplay({ stock, stockData }: IndexDataDisplayProps) {
  if (stockData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">{stock.name}</h2>
        <p className="text-gray-500">暂无数据</p>
      </div>
    );
  }

  // 判断是基金数据还是指数数据
  const isFundData = stock.type === 'fund';
  
  if (isFundData) {
    // 基金数据：显示净值走势
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800">{stock.name}</h2>
        
        {/* 数据统计 */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-2">最新净值（复权）</h3>
            <p className="text-2xl font-bold text-blue-600">
              {(stockData[stockData.length - 1]?.netValue || stockData[stockData.length - 1]?.cp)?.toFixed(4) || 'N/A'}
            </p>
          </div>
        </div>

        {/* 净值走势图 */}
        <ChartContainer
          data={stockData.map((item) => ({
            date: item.date,
            dateShort: formatDateShort(item.date),
            fullDate: formatDate(item.date),
            netValue: item.netValue || item.cp,
          }))}
          lines={[
            {
              dataKey: 'netValue',
              name: '复权净值',
              stroke: '#3b82f6',
              strokeWidth: 2,
            },
          ]}
          yAxes={[
            {
              yAxisId: 'left',
              label: '净值',
              tickFormatter: (value) => value.toFixed(2),
            },
          ]}
          title="净值走势（复权）"
          xTickFormatter={(value) => {
            const item = stockData.find(d => d.date === value);
            return item ? formatDateShort(item.date) : value;
          }}
          xTickInterval={Math.floor(stockData.length / 10)}
          tooltipContent={(props: any) => {
            const { active, payload, label } = props;
            if (!active || !payload || !payload[0]) return null;
            
            const dataPoint = payload[0].payload;
            const fullDate = dataPoint?.fullDate || formatDate(label);
            const numValue = typeof payload[0].value === 'number' ? payload[0].value : null;
            
            return (
              <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                <p className="font-semibold mb-1">日期: {fullDate}</p>
                <p className="text-sm">
                  复权净值: {numValue !== null && !isNaN(numValue) ? numValue.toFixed(4) : 'N/A'}
                </p>
              </div>
            );
          }}
        />
      </div>
    );
  }

  // 指数数据：显示PE TTM和市值
  const hasIndexPrice = stockData.some(item => item.cp !== undefined && item.cp !== null);
  
  // 如果指数有价格数据但没有PE数据，只显示指数点位
  const hasPEData = stockData.some(item => item['pe_ttm.mcw'] !== undefined && item['pe_ttm.mcw'] !== null);
  
  if (hasIndexPrice && !hasPEData) {
    // 只有指数点位，没有PE数据
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800">{stock.name}</h2>
        
        {/* 数据统计 */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-2">最新点位</h3>
            <p className="text-2xl font-bold text-blue-600">
              {stockData[stockData.length - 1]?.cp?.toFixed(2) || 'N/A'}
            </p>
          </div>
        </div>

        {/* 指数点位走势图 */}
        <ChartContainer
          data={stockData.map((item) => ({
            date: item.date,
            dateShort: formatDateShort(item.date),
            fullDate: formatDate(item.date),
            indexPrice: item.cp,
          }))}
          lines={[
            {
              dataKey: 'indexPrice',
              name: '指数点位',
              stroke: '#3b82f6',
              strokeWidth: 2,
            },
          ]}
          yAxes={[
            {
              yAxisId: 'left',
              label: '点位',
              tickFormatter: (value) => value.toFixed(0),
            },
          ]}
          title="指数点位走势"
          xTickFormatter={(value) => {
            const item = stockData.find(d => d.date === value);
            return item ? formatDateShort(item.date) : value;
          }}
          xTickInterval={Math.floor(stockData.length / 10)}
          tooltipContent={(props: any) => {
            const { active, payload, label } = props;
            if (!active || !payload || !payload[0]) return null;
            
            const dataPoint = payload[0].payload;
            const fullDate = dataPoint?.fullDate || formatDate(label);
            const numValue = typeof payload[0].value === 'number' ? payload[0].value : null;
            
            return (
              <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                <p className="font-semibold mb-1">日期: {fullDate}</p>
                <p className="text-sm">
                  指数点位: {numValue !== null && !isNaN(numValue) ? numValue.toFixed(2) : 'N/A'}
                </p>
              </div>
            );
          }}
        />
      </div>
    );
  }
  
  const peTtmValues = stockData
    .map(item => item['pe_ttm.mcw'])
    .filter((val): val is number => val !== null && val !== undefined);
  
  // 判断市值是否需要使用万亿单位
  const rawMarketCapValues = stockData
    .map(item => item.mc)
    .filter((val): val is number => val !== null && val !== undefined);
  const maxMarketCap = rawMarketCapValues.length > 0 ? Math.max(...rawMarketCapValues) : 0;
  const useTrillion = maxMarketCap >= 1000000000000; // 大于等于1万亿
  const marketCapDivisor = useTrillion ? 1000000000000 : 100000000;
  const marketCapUnit = useTrillion ? '万亿' : '亿';
  
  const marketCapValues = rawMarketCapValues.map(val => val / marketCapDivisor);

  // 计算PE TTM的范围（最小值-10%，最大值+10%）
  const peTtmMin = peTtmValues.length > 0 ? Math.min(...peTtmValues) : 0;
  const peTtmMax = peTtmValues.length > 0 ? Math.max(...peTtmValues) : 0;
  const peTtmRange = peTtmMax - peTtmMin;
  const peTtmDomain: [number, number] = [
    Math.max(0, peTtmMin - peTtmRange * 0.1),
    peTtmMax + peTtmRange * 0.1
  ];

  // 计算总市值的范围（最小值-10%，最大值+10%）
  const marketCapMin = marketCapValues.length > 0 ? Math.min(...marketCapValues) : 0;
  const marketCapMax = marketCapValues.length > 0 ? Math.max(...marketCapValues) : 0;
  const marketCapRange = marketCapMax - marketCapMin;
  const marketCapDomain: [number, number] = [
    Math.max(0, marketCapMin - marketCapRange * 0.1),
    marketCapMax + marketCapRange * 0.1
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">{stock.name}</h2>
      
      {/* 数据统计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-green-900 mb-2">PE TTM (市值加权)</h3>
          <p className="text-2xl font-bold text-green-600">
            {stockData[stockData.length - 1]?.['pe_ttm.mcw']?.toFixed(2) || 'N/A'}
          </p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">总市值</h3>
          <p className="text-2xl font-bold text-blue-600">
            {formatNumber(stockData[stockData.length - 1]?.mc)}
          </p>
        </div>
      </div>

      {/* 合并趋势图 */}
      <ChartContainer
        data={stockData.map((item) => ({
          date: item.date,
          dateShort: formatDateShort(item.date),
          fullDate: formatDate(item.date),
          peTtm: item['pe_ttm.mcw'],
          marketCap: item.mc ? item.mc / marketCapDivisor : null,
          rawMarketCap: item.mc,
        }))}
        lines={[
          {
            dataKey: 'peTtm',
            name: 'PE TTM (市值加权)',
            stroke: '#10b981',
            strokeWidth: 2,
            yAxisId: 'left',
          },
          {
            dataKey: 'marketCap',
            name: `总市值 (${marketCapUnit})`,
            stroke: '#3b82f6',
            strokeWidth: 2,
            yAxisId: 'right',
          },
        ]}
        yAxes={[
          {
            yAxisId: 'left',
            orientation: 'left',
            label: 'PE TTM',
            domain: peTtmDomain,
            tickFormatter: (value) => value.toFixed(2),
          },
          {
            yAxisId: 'right',
            orientation: 'right',
            label: `总市值 (${marketCapUnit})`,
            domain: marketCapDomain,
            tickFormatter: (value) => value.toFixed(2),
          },
        ]}
        title="PE TTM 与总市值趋势"
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
                    <p key={index} className="text-sm">
                      总市值: {rawValue ? formatNumber(rawValue) : 'N/A'}
                    </p>
                  );
                }
                return null;
              })}
            </div>
          );
        }}
      />
    </div>
  );
}
