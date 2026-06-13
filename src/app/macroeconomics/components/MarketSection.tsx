'use client';

import { useMemo } from 'react';
import { ChartContainer, LineConfig } from '../../components/Chart';
import { MarketRegion } from '../types';
import { buildSeries, colorForCode, formatTickDate, mergeSeries } from '../utils';

interface MarketSectionProps {
  region: MarketRegion;
}

const ACCENT_STYLES: Record<MarketRegion['accent'], { dot: string; text: string }> = {
  blue: { dot: 'bg-blue-500', text: 'text-blue-700' },
  red: { dot: 'bg-red-500', text: 'text-red-700' },
  amber: { dot: 'bg-amber-500', text: 'text-amber-700' },
  emerald: { dot: 'bg-emerald-500', text: 'text-emerald-700' },
  purple: { dot: 'bg-purple-500', text: 'text-purple-700' },
};

/** 单点波动强度（以基准 1000 为标尺） */
const BASE_BY_REGION: Record<string, number> = {
  us: 4800,
  cn: 3200,
  hk: 19000,
  'jp-kr': 35000,
};

/**
 * 单个市场板块：以折线图展示该地区主要指数走势
 * 折线图基于 mock 时间序列，标注「示例数据」字样
 */
export default function MarketSection({ region }: MarketSectionProps) {
  const accent = ACCENT_STYLES[region.accent];

  // 用 useMemo 缓存生成的 mock 数据；基于 code 哈希保证稳定
  const { data, lines, latest } = useMemo(() => {
    const baseline = BASE_BY_REGION[region.id] ?? 1000;
    const seriesMap: Record<string, ReturnType<typeof buildSeries>> = {};

    region.indices.forEach((idx, i) => {
      const base = baseline * (0.6 + i * 0.18);
      seriesMap[idx.code] = buildSeries(`${region.id}:${idx.code}`, {
        base,
        volatility: 0.012,
        drift: 0.0008,
        points: 60,
      });
    });

    const merged = mergeSeries(seriesMap);

    const lineConfigs: LineConfig[] = region.indices.map((idx) => ({
      dataKey: idx.code,
      name: idx.symbol ?? idx.name,
      stroke: colorForCode(idx.code),
      strokeWidth: 2,
    }));

    const latestSnapshot: Record<string, { value: number; change: number }> = {};
    region.indices.forEach((idx) => {
      const series = seriesMap[idx.code];
      const first = series[0]?.value ?? 0;
      const last = series[series.length - 1]?.value ?? 0;
      latestSnapshot[idx.code] = {
        value: last,
        change: first === 0 ? 0 : ((last - first) / first) * 100,
      };
    });

    return { data: merged, lines: lineConfigs, latest: latestSnapshot };
  }, [region]);

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 pt-6 pb-3 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${accent.dot}`} />
            <h3 className={`text-xl font-bold ${accent.text}`}>{region.name}</h3>
          </div>
          <p className="text-sm text-gray-500 pl-5">{region.description}</p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-gray-400 bg-gray-50 px-2 py-1 rounded">
          示例数据 · 近 60 日
        </span>
      </div>

      {/* 指数 chips：展示每条线的颜色、最新值与区间涨跌 */}
      <div className="px-6 pb-3 flex flex-wrap gap-2">
        {region.indices.map((idx) => {
          const snap = latest[idx.code];
          const positive = snap.change >= 0;
          return (
            <div
              key={idx.code}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-md border border-gray-100"
            >
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: colorForCode(idx.code) }}
              />
              <span className="text-xs font-medium text-gray-700">
                {idx.symbol ?? idx.name}
              </span>
              <span className="text-xs text-gray-900 tabular-nums">
                {snap.value.toLocaleString('en-US')}
              </span>
              <span
                className={`text-[10px] tabular-nums ${
                  positive ? 'text-red-600' : 'text-emerald-600'
                }`}
              >
                {positive ? '+' : ''}
                {snap.change.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>

      <div className="px-2 pb-2">
        <ChartContainer
          data={data}
          lines={lines}
          height={280}
          xDataKey="date"
          xTickFormatter={formatTickDate}
          xTickInterval="preserveStartEnd"
          showGrid
          showLegend={false}
        />
      </div>
    </div>
  );
}
