'use client';

import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MacroIndex } from '../types';
import { buildSeries, formatTickDate } from '../utils';

interface FearIndexCardProps {
  index: MacroIndex;
}

/**
 * 根据 VIX 数值返回状态文本与样式
 * < 20  平稳 / 20-30 警觉 / > 30 恐慌
 */
function classifyVix(value: number) {
  if (value < 20) return { label: '平稳', tone: 'text-emerald-700', bg: 'bg-emerald-50' };
  if (value <= 30) return { label: '警觉', tone: 'text-amber-700', bg: 'bg-amber-50' };
  return { label: '恐慌', tone: 'text-red-700', bg: 'bg-red-50' };
}

/**
 * VIX 恐慌指数：折线图 + 阈值参考区域
 */
export default function FearIndexCard({ index }: FearIndexCardProps) {
  const { data, latest, change } = useMemo(() => {
    const series = buildSeries(`vix:${index.code}`, {
      base: 18,
      volatility: 0.05,
      drift: 0.0008,
      points: 60,
      floor: 9,
      ceil: 55,
    });
    const last = series[series.length - 1]?.value ?? 0;
    const first = series[0]?.value ?? 0;
    return {
      data: series,
      latest: last,
      change: first === 0 ? 0 : ((last - first) / first) * 100,
    };
  }, [index.code]);

  const status = classifyVix(latest);
  const positive = change >= 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-orange-100 overflow-hidden">
      <div className="px-6 pt-6 pb-3 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-500" />
            <h3 className="text-xl font-bold text-orange-900">
              {index.symbol ?? index.name}
            </h3>
            <span
              className={`text-xs px-2 py-0.5 rounded ${status.bg} ${status.tone}`}
            >
              {status.label}
            </span>
          </div>
          <p className="text-sm text-gray-500 pl-5">{index.name}</p>
          {index.description && (
            <p className="text-xs text-gray-400 pl-5 mt-1 max-w-2xl">
              {index.description}
            </p>
          )}
        </div>
        <span className="text-[10px] uppercase tracking-wider text-gray-400 bg-gray-50 px-2 py-1 rounded">
          示例数据 · 近 60 日
        </span>
      </div>

      <div className="px-6 pb-2 flex flex-wrap items-end gap-6">
        <div>
          <div className="text-xs text-gray-500 mb-1">当前值</div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900 tabular-nums">
              {latest.toFixed(2)}
            </span>
            <span
              className={`text-sm tabular-nums ${
                positive ? 'text-red-600' : 'text-emerald-600'
              }`}
            >
              {positive ? '+' : ''}
              {change.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="flex gap-2 text-xs">
          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
            &lt; 20 平稳
          </span>
          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700">
            20 – 30 警觉
          </span>
          <span className="px-2 py-0.5 rounded bg-red-100 text-red-700">
            &gt; 30 恐慌
          </span>
        </div>
      </div>

      <div className="px-4 pb-4">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              angle={-45}
              textAnchor="end"
              height={60}
              interval="preserveStartEnd"
              tickFormatter={formatTickDate}
            />
            <YAxis domain={['dataMin - 2', 'dataMax + 2']} />

            <ReferenceArea y1={0} y2={20} fill="#10b981" fillOpacity={0.06} />
            <ReferenceArea y1={20} y2={30} fill="#f59e0b" fillOpacity={0.08} />
            <ReferenceArea y1={30} y2={100} fill="#ef4444" fillOpacity={0.08} />
            <ReferenceLine y={20} stroke="#10b981" strokeDasharray="4 4" />
            <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="4 4" />

            <Tooltip
              formatter={(value: number) => [value.toFixed(2), index.symbol ?? index.name]}
              labelFormatter={(label) => `日期：${label}`}
            />

            <Line
              type="monotone"
              dataKey="value"
              name={index.symbol ?? index.name}
              stroke="#ea580c"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
