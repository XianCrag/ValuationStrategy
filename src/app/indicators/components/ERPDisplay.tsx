'use client';

import { StockData } from '../types';
import { formatDate, formatDateShort } from '../utils';
import { optimizeChartData } from '../../backtest/chart-utils';
import { ChartContainer } from '../../components/Chart';

interface ERPDisplayProps {
  aStockData: StockData[];
  bondData: StockData[];
}

export default function ERPDisplay({ aStockData, bondData }: ERPDisplayProps) {
  if (aStockData.length === 0 || bondData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">股权风险溢价 (ERP)</h2>
        <p className="text-gray-500">暂无数据</p>
      </div>
    );
  }

  // 创建日期到国债利率的映射
  const bondRateMap = new Map<string, number>();
  bondData.forEach(item => {
    const rate = item['tcm_y10'] as number;
    if (rate !== null && rate !== undefined) {
      bondRateMap.set(item.date, rate);
    }
  });

  // 计算ERP：ERP = (1 / PE) - 国债利率
  const erpData = aStockData
    .map(item => {
      const pe = item['pe_ttm.mcw'] as number;
      const bondRate = bondRateMap.get(item.date);
      
      if (pe && pe > 0 && bondRate !== null && bondRate !== undefined) {
        const earningsYield = 1 / pe; // 盈利收益率
        const erp = (earningsYield * 100 - bondRate); // bondRate已经是百分比（API已转换）
        
        return {
          date: item.date,
          dateShort: formatDateShort(item.date),
          fullDate: formatDate(item.date),
          erp,
          earningsYield: earningsYield * 100, // 转换为百分比
          bondRate: bondRate, // 已经是百分比（API已转换）
          pe,
        };
      }
      return null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (erpData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">股权风险溢价 (ERP)</h2>
        <p className="text-gray-500">无法计算ERP，数据不足</p>
      </div>
    );
  }

  // 优化图表数据
  const optimizedData = optimizeChartData(erpData, {
    maxPoints: 300,
    keepFirstAndLast: true,
  });

  const latestData = erpData[erpData.length - 1];
  
  // 计算ERP的统计信息
  const erpValues = erpData.map(d => d.erp);
  const avgERP = erpValues.reduce((sum, val) => sum + val, 0) / erpValues.length;
  const minERP = Math.min(...erpValues);
  const maxERP = Math.max(...erpValues);

  const erpRange = maxERP - minERP;
  const erpDomain: [number, number] = [
    minERP - erpRange * 0.1,
    maxERP + erpRange * 0.1
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">股权风险溢价 (ERP)</h2>
      
      <div className="mb-4 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-gray-700 mb-2">
          <strong>公式：</strong> ERP = 盈利收益率(%) - 无风险利率(%)
        </p>
        <p className="text-sm text-gray-700 mb-2">
          <strong>说明：</strong> 盈利收益率 = (1 / PE) × 100%，无风险利率 = 10年期国债收益率
        </p>
        <p className="text-sm text-gray-600">
          ERP越高，说明股票相对债券越有吸引力；ERP越低，说明股票估值越高
        </p>
      </div>

      {/* 数据统计 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-purple-900 mb-2">当前ERP</h3>
          <p className="text-2xl font-bold text-purple-600">
            {latestData.erp.toFixed(2)}%
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-green-900 mb-2">盈利收益率</h3>
          <p className="text-2xl font-bold text-green-600">
            {latestData.earningsYield.toFixed(2)}%
          </p>
          <p className="text-xs text-green-700 mt-1">1 / PE = 1 / {latestData.pe.toFixed(2)}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">国债利率</h3>
          <p className="text-2xl font-bold text-blue-600">
            {latestData.bondRate.toFixed(2)}%
          </p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-orange-900 mb-2">历史平均ERP</h3>
          <p className="text-2xl font-bold text-orange-600">
            {avgERP.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* ERP趋势图 */}
      <ChartContainer
        data={optimizedData}
        lines={[
          {
            dataKey: 'erp',
            name: '股权风险溢价 (%)',
            stroke: '#8b5cf6',
            strokeWidth: 3,
          },
        ]}
        yAxes={[
          {
            yAxisId: 'left',
            label: 'ERP (%)',
            domain: erpDomain,
            tickFormatter: (value) => value.toFixed(2),
          },
        ]}
        title="股权风险溢价趋势"
        xTickFormatter={(value) => {
          const item = optimizedData.find(d => d.date === value);
          return item ? item.dateShort : value;
        }}
        tooltipContent={(props: any) => {
          const { active, payload } = props;
          if (!active || !payload || payload.length === 0) return null;
          const data = payload[0].payload;
          
          return (
            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
              <p className="font-semibold mb-2">{data.fullDate}</p>
              <p className="text-sm mb-1">
                <span className="font-medium text-purple-600">ERP:</span> {data.erp.toFixed(2)}%
              </p>
              <p className="text-sm mb-1">
                <span className="font-medium text-green-600">盈利收益率:</span> {data.earningsYield.toFixed(2)}%
              </p>
              <p className="text-sm mb-1">
                <span className="font-medium text-blue-600">国债利率:</span> {data.bondRate.toFixed(2)}%
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">A股全指PE:</span> {data.pe.toFixed(2)}
              </p>
            </div>
          );
        }}
      />

      {/* 历史分位 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">历史分位统计</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">最小值</p>
            <p className="text-xl font-bold text-red-600">{minERP.toFixed(2)}%</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">平均值</p>
            <p className="text-xl font-bold text-gray-700">{avgERP.toFixed(2)}%</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">最大值</p>
            <p className="text-xl font-bold text-green-600">{maxERP.toFixed(2)}%</p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-gray-50 rounded">
          <p className="text-sm text-gray-700">
            <strong>当前分位：</strong> 
            {(() => {
              const percentile = ((erpValues.filter(v => v < latestData.erp).length / erpValues.length) * 100);
              return ` ${percentile.toFixed(1)}% （${percentile < 20 ? '低估' : percentile < 40 ? '偏低' : percentile < 60 ? '适中' : percentile < 80 ? '偏高' : '高估'}）`;
            })()}
          </p>
        </div>
      </div>
    </div>
  );
}
