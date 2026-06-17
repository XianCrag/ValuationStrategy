'use client';

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  CycleAnalysis as CycleAnalysisData,
  CyclePosition,
  Cyclicality,
  GeneratedBy,
} from './types';

interface CycleAnalysisProps {
  data: CycleAnalysisData | null;
  loading: boolean;
}

const CONFIDENCE_META: Record<CycleAnalysisData['confidence'], { label: string; chip: string }> = {
  high: { label: '置信度 高', chip: 'bg-green-50 text-green-700' },
  medium: { label: '置信度 中', chip: 'bg-amber-50 text-amber-700' },
  low: { label: '置信度 低', chip: 'bg-gray-100 text-gray-500' },
};

const GENERATED_BY_META: Record<GeneratedBy, string> = {
  'cursor-dev': '由 Cursor 离线生成',
  ai: 'AI 生成',
  mock: '示例数据',
};

const CYCLICALITY_META: Record<Cyclicality, { label: string; chip: string }> = {
  strong: { label: '强周期', chip: 'bg-red-50 text-red-700' },
  moderate: { label: '中周期', chip: 'bg-amber-50 text-amber-700' },
  weak: { label: '弱周期', chip: 'bg-green-50 text-green-700' },
};

const POSITION_META: Record<CyclePosition, { label: string; color: string }> = {
  trough: { label: '周期底部', color: 'text-green-600' },
  rising: { label: '上行期', color: 'text-green-600' },
  peak: { label: '周期顶部', color: 'text-red-600' },
  falling: { label: '下行期', color: 'text-amber-600' },
  unknown: { label: '难以判定', color: 'text-gray-500' },
};

/** 股价周期指标：从年度收盘价序列算出最新股价在历史区间中的分位与档位。 */
function computePriceStats(
  annual: CycleAnalysisData['annual'],
): { percentile: number; label: string; chip: string; low: number; high: number; latest: number; span: number } | null {
  const prices = annual
    .map((p) => (typeof p.priceClose === 'number' ? p.priceClose : null))
    .filter((v): v is number => v != null && v > 0);
  if (prices.length < 2) return null;

  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const latest = prices[prices.length - 1];
  const percentile = high > low ? Math.round(((latest - low) / (high - low)) * 100) : 50;

  let label = '中位';
  let chip = 'bg-amber-50 text-amber-700';
  if (percentile >= 70) {
    label = '高位';
    chip = 'bg-red-50 text-red-700';
  } else if (percentile <= 30) {
    label = '低位';
    chip = 'bg-green-50 text-green-700';
  }

  return { percentile, label, chip, low, high, latest, span: prices.length };
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('zh-CN', { hour12: false });
  } catch {
    return iso;
  }
}

export default function CycleAnalysis({ data, loading }: CycleAnalysisProps) {
  if (loading) {
    return (
      <section className="mt-8">
        <SectionHeader />
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="h-5 w-40 bg-gray-100 rounded animate-pulse mb-4" />
          <div className="h-56 w-full bg-gray-50 rounded animate-pulse" />
        </div>
      </section>
    );
  }

  if (!data) return null;

  if (data.status === 'not-in-pool') {
    return (
      <section className="mt-8">
        <SectionHeader />
        <div className="p-6 rounded-xl border-2 border-dashed border-gray-200 text-center">
          <p className="text-gray-500">周期分析仅对股票池内标的生成。</p>
          <p className="mt-1 text-sm text-gray-400">点击上方「+ 加入选股池」，分析将在后续由脚本离线生成。</p>
        </div>
      </section>
    );
  }

  if (data.status === 'pending') {
    return (
      <section className="mt-8">
        <SectionHeader />
        <div className="p-6 rounded-xl bg-blue-50/50 border border-blue-100 text-center">
          <p className="text-blue-700 font-medium">已在股票池 · 周期分析待生成</p>
          <p className="mt-1 text-sm text-blue-500">
            开发阶段由脚本离线生成 —— 运行{' '}
            <code className="px-1 py-0.5 rounded bg-blue-100 text-blue-700">scripts/cycle_fetch.py {data.code}</code>{' '}
            取 10 年序列后写入 data/cycle/{data.code}.json
          </p>
        </div>
      </section>
    );
  }

  const conf = CONFIDENCE_META[data.confidence];
  const cyc = CYCLICALITY_META[data.cyclicality];
  const pos = POSITION_META[data.position];

  const chartData = data.annual.map((p) => ({
    year: p.year,
    营收: p.revenue,
    归母净利: p.netProfit,
    营收增速: p.revenueYoY,
    股价: p.priceClose ?? null,
  }));

  const priceStats = computePriceStats(data.annual);

  return (
    <section className="mt-8">
      <SectionHeader />

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">
          🟨 {GENERATED_BY_META[data.generatedBy]}
        </span>
        <span className={`px-2 py-0.5 rounded-full font-medium ${conf.chip}`}>{conf.label}</span>
        {data.reportPeriod && (
          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">截止 {data.reportPeriod}</span>
        )}
        <span className="text-gray-400">来源：{data.source}</span>
        {data.generatedAt && (
          <>
            <span className="text-gray-300">·</span>
            <span className="text-gray-400">生成于 {formatTime(data.generatedAt)}</span>
          </>
        )}
      </div>

      {/* 结论区：仪表盘 + 判定 + 论证 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-5 items-center">
          <div className="flex flex-col items-center">
            <CycleGauge score={data.positionScore} />
            <div className="text-center -mt-1">
              <span className={`text-lg font-bold ${pos.color}`}>{pos.label}</span>
              {data.positionScore != null && (
                <span className="ml-1 text-sm text-gray-400">（景气位置 {data.positionScore}/100）</span>
              )}
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span
                className={`px-2.5 py-1 rounded-full text-sm font-semibold ${
                  data.isCyclical ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'
                }`}
              >
                {data.isCyclical ? '周期股' : '非典型周期股'}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${cyc.chip}`}>周期性 · {cyc.label}</span>
              {priceStats && (
                <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${priceStats.chip}`}>
                  股价周期 · {priceStats.label}（分位 {priceStats.percentile}%）
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{data.summary}</p>
            {priceStats && (
              <p className="mt-2 text-xs text-gray-400">
                近 {priceStats.span} 年股价（不复权）区间 ¥{priceStats.low}–¥{priceStats.high}，最新年度收盘 ¥{priceStats.latest}
                ；股价分位越高代表当前股价相对自身历史越贵（仅参考，非择时）。
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 10 年财务序列：营收/净利柱 + 营收增速线 */}
      <div className="mt-5 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-1">近 {data.annual.length} 年营收 / 净利 / 增速 / 股价</h3>
        <p className="text-xs text-gray-400 mb-4">
          柱：营收·归母净利（亿元，左轴）｜线：营收同比增速（%，右轴）｜<span className="text-emerald-600">绿线：年度股价（不复权·元，独立刻度）</span>，用于对比「盈利周期 vs 股价周期」
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}`} />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => `${v}%`}
            />
            {/* 股价独立隐藏轴：股价量级与营收/增速差异大，单独自适应缩放，仅看周期形态 */}
            <YAxis yAxisId="price" hide domain={['auto', 'auto']} />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (value == null) return ['—', name];
                if (name === '营收增速') return [`${value}%`, name];
                if (name === '股价') return [`¥${value}`, '年度股价(不复权)'];
                return [`${value} 亿`, name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="left" dataKey="营收" fill="#93c5fd" radius={[2, 2, 0, 0]} isAnimationActive={false} />
            <Bar yAxisId="left" dataKey="归母净利" fill="#6366f1" radius={[2, 2, 0, 0]} isAnimationActive={false} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="营收增速"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 3 }}
              isAnimationActive={false}
            />
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="股价"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={{ r: 3 }}
              connectNulls
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 周期驱动因素 */}
      {data.drivers.length > 0 && (
        <div className="mt-5 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-3">周期驱动因素</h3>
          <ul className="space-y-2">
            {data.drivers.map((d, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-600">
                <span className="text-blue-400 mt-0.5">•</span>
                <span className="leading-relaxed">{d}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 text-xs text-gray-400">
        ⚠️ 周期性与周期位置为基于历史财务序列的定性判断，非择时建议；景气位置 0（底部）~100（顶部）为相对历史的估算。
      </p>
    </section>
  );
}

function SectionHeader() {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="w-1.5 h-6 rounded bg-indigo-500" />
      <h2 className="text-xl font-bold text-gray-900">周期分析 · 周期性与当前周期位置</h2>
    </div>
  );
}

/** 半圆仪表盘：底部(绿) → 中部(黄) → 顶部(红)，指针指示当前景气位置。 */
function CycleGauge({ score }: { score: number | null }) {
  const cx = 110;
  const cy = 110;
  const r = 88;
  const s = score == null ? 50 : Math.max(0, Math.min(100, score));

  const polar = (v: number) => {
    const ang = ((180 - 1.8 * v) * Math.PI) / 180;
    return { x: cx + r * Math.cos(ang), y: cy - r * Math.sin(ang) };
  };
  const arc = (v0: number, v1: number) => {
    const p0 = polar(v0);
    const p1 = polar(v1);
    return `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} A ${r} ${r} 0 0 1 ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  };
  const tip = polar(s);
  const needleEnd = { x: cx + (r - 22) * Math.cos(((180 - 1.8 * s) * Math.PI) / 180), y: cy - (r - 22) * Math.sin(((180 - 1.8 * s) * Math.PI) / 180) };

  return (
    <svg viewBox="0 0 220 138" width="200" height="126" role="img" aria-label={`景气位置 ${score ?? '未知'}`}>
      <path d={arc(0, 33)} stroke="#22c55e" strokeWidth={14} fill="none" />
      <path d={arc(33, 66)} stroke="#f59e0b" strokeWidth={14} fill="none" />
      <path d={arc(66, 100)} stroke="#ef4444" strokeWidth={14} fill="none" />
      {score != null && (
        <>
          <line x1={cx} y1={cy} x2={needleEnd.x} y2={needleEnd.y} stroke="#1f2937" strokeWidth={3} strokeLinecap="round" />
          <circle cx={cx} cy={cy} r={5} fill="#1f2937" />
          <circle cx={tip.x} cy={tip.y} r={4} fill="#1f2937" />
        </>
      )}
      <text x="18" y="132" fontSize="11" fill="#16a34a">底部</text>
      <text x="186" y="132" fontSize="11" fill="#dc2626">顶部</text>
    </svg>
  );
}
