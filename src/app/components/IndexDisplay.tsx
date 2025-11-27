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
import { StockData, StockConfig } from '../indicators/types';
import { formatNumber, formatDate, formatDateShort } from '../indicators/utils';

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
  const isFundData = 'netValue' in stockData[0] || 'cp' in stockData[0];
  
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
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">净值走势（复权）</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart
              data={stockData.map((item) => ({
                date: item.date,
                dateShort: formatDateShort(item.date),
                fullDate: formatDate(item.date),
                netValue: item.netValue || item.cp,
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
                label={{ value: '净值', angle: -90, position: 'insideLeft' }}
                tickFormatter={(value) => value.toFixed(2)}
              />
              <Tooltip
                formatter={(value: any) => {
                  const numValue = typeof value === 'number' ? value : null;
                  return numValue !== null && !isNaN(numValue)
                    ? [numValue.toFixed(4), '复权净值']
                    : ['N/A', '复权净值'];
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
                dataKey="netValue"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
                name="复权净值"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // 指数数据：显示PE TTM和市值
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
  const peTtmDomain = [
    Math.max(0, peTtmMin - peTtmRange * 0.1),
    peTtmMax + peTtmRange * 0.1
  ];

  // 计算总市值的范围（最小值-10%，最大值+10%）
  const marketCapMin = marketCapValues.length > 0 ? Math.min(...marketCapValues) : 0;
  const marketCapMax = marketCapValues.length > 0 ? Math.max(...marketCapValues) : 0;
  const marketCapRange = marketCapMax - marketCapMin;
  const marketCapDomain = [
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
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">PE TTM 与总市值趋势</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={stockData.map((item, index) => ({
              date: item.date, // 使用完整日期作为唯一标识
              dateShort: formatDateShort(item.date), // 用于显示
              fullDate: formatDate(item.date),
              peTtm: item['pe_ttm.mcw'],
              marketCap: item.mc ? item.mc / marketCapDivisor : null,
              rawMarketCap: item.mc, // 保留原始值用于 Tooltip
              index, // 保留索引作为备用标识
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
                // 从完整日期中提取并格式化显示
                const item = stockData.find(d => d.date === value);
                return item ? formatDateShort(item.date) : value;
              }}
            />
            <YAxis
              yAxisId="left"
              domain={peTtmDomain}
              label={{ value: 'PE TTM', angle: -90, position: 'insideLeft' }}
              tickFormatter={(value) => value.toFixed(2)}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={marketCapDomain}
              label={{ value: `总市值 (${marketCapUnit})`, angle: 90, position: 'insideRight' }}
              tickFormatter={(value) => value.toFixed(2)}
            />
            <Tooltip
              formatter={(value: any, name: string, props: any) => {
                if (name === 'peTtm') {
                  const numValue = typeof value === 'number' ? value : null;
                  return numValue !== null && !isNaN(numValue)
                    ? [numValue.toFixed(2), 'PE TTM (市值加权)']
                    : ['N/A', 'PE TTM (市值加权)'];
                }
                if (name === 'marketCap') {
                  // 使用原始市值值来格式化
                  const rawValue = props.payload?.rawMarketCap;
                  if (rawValue !== null && rawValue !== undefined && typeof rawValue === 'number') {
                    return [formatNumber(rawValue), '总市值'];
                  }
                  // 如果没有原始值，使用转换后的值
                  const numValue = typeof value === 'number' ? value : null;
                  if (numValue !== null && !isNaN(numValue)) {
                    return [`${numValue.toFixed(2)} ${marketCapUnit}`, '总市值'];
                  }
                  return ['N/A', '总市值'];
                }
                const numValue = typeof value === 'number' ? value : null;
                return numValue !== null && !isNaN(numValue) ? [numValue.toFixed(2), name] : ['N/A', name];
              }}
              labelFormatter={(label, payload) => {
                // 直接使用 payload 中的数据，确保精确匹配
                if (payload && payload.length > 0 && payload[0].payload) {
                  const dataPoint = payload[0].payload;
                  if (dataPoint.fullDate) {
                    return `日期: ${dataPoint.fullDate}`;
                  }
                  // 如果label是完整日期，直接格式化
                  if (typeof label === 'string' && label.includes('-')) {
                    return `日期: ${formatDate(label)}`;
                  }
                }
                // 备用方案：通过完整日期查找
                const dataPoint = stockData.find(item => item.date === label);
                return dataPoint ? `日期: ${formatDate(dataPoint.date)}` : `日期: ${label}`;
              }}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="peTtm"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
              name="PE TTM (市值加权)"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="marketCap"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
              name={`总市值 (${marketCapUnit})`}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
