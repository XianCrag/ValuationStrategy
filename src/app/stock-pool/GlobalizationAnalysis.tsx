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
import type { GeneratedBy, GlobalizationAnalysis as GlobalizationData } from './types';

interface GlobalizationAnalysisProps {
  data: GlobalizationData | null;
  loading: boolean;
}

const CONFIDENCE_META: Record<GlobalizationData['confidence'], { label: string; chip: string }> = {
  high: { label: '置信度 高', chip: 'bg-green-50 text-green-700' },
  medium: { label: '置信度 中', chip: 'bg-amber-50 text-amber-700' },
  low: { label: '置信度 低', chip: 'bg-gray-100 text-gray-500' },
};

const GENERATED_BY_META: Record<GeneratedBy, string> = {
  'cursor-dev': '由 Cursor 离线生成',
  ai: 'AI 生成',
  mock: '示例数据',
};

function fmtPct(v: number | null, digits = 1): string {
  return v == null ? '—' : `${v.toFixed(digits)}%`;
}
function fmtYi(v: number | null): string {
  return v == null ? '—' : `${v.toFixed(0)} 亿`;
}
function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('zh-CN', { hour12: false });
  } catch {
    return iso;
  }
}

export default function GlobalizationAnalysis({ data, loading }: GlobalizationAnalysisProps) {
  if (loading) {
    return (
      <section className="mt-8">
        <SectionHeader />
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="h-5 w-40 bg-gray-100 rounded animate-pulse mb-4" />
          <div className="h-48 w-full bg-gray-50 rounded animate-pulse" />
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
          <p className="text-gray-500">全球化、出海分析仅对股票池内标的生成。</p>
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
          <p className="text-blue-700 font-medium">已在股票池 · 全球化分析待生成</p>
          <p className="mt-1 text-sm text-blue-500">
            开发阶段由脚本离线生成 —— 运行{' '}
            <code className="px-1 py-0.5 rounded bg-blue-100 text-blue-700">scripts/globalization_fetch.py {data.code}</code>{' '}
            取分地区主营构成后写入 data/globalization/{data.code}.json
          </p>
        </div>
      </section>
    );
  }

  const conf = CONFIDENCE_META[data.confidence];
  const latest = data.annual.length > 0 ? data.annual[data.annual.length - 1] : null;
  const hasSeries = data.annual.some((p) => p.overseasIncome != null || p.overseasRatio != null);

  const chartData = data.annual.map((p) => ({
    year: p.year,
    海外收入: p.overseasIncome,
    海外占比: p.overseasRatio,
  }));

  return (
    <section className="mt-8">
      <SectionHeader />

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">
          🟨 {GENERATED_BY_META[data.generatedBy]}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
          🟦 海外收入序列
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

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Kpi label="最新海外收入占比" value={fmtPct(latest?.overseasRatio ?? null)} hint={`${data.latestYear ?? '—'} 年报` } />
        <Kpi label="最新海外收入" value={fmtYi(latest?.overseasIncome ?? null)} hint="按地区主营构成" />
        <Kpi label="披露年度" value={data.latestYear ?? '—'} hint="分地区拆分口径" />
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 左：海外收入趋势 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-1">海外收入 / 占比趋势</h3>
          <p className="text-xs text-gray-400 mb-4">柱：海外收入（亿元，左轴）｜线：海外占比（%，右轴）</p>
          {hasSeries ? (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === '海外占比' ? [`${value}%`, name] : [`${value} 亿`, name]
                  }
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="海外收入" fill="#60a5fa" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="海外占比"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex flex-col items-center justify-center text-center text-gray-400">
              <p>未披露分地区收入拆分</p>
              <p className="text-xs mt-1">该公司年报未按地区列示主营构成，以右侧 AI 定性为准</p>
            </div>
          )}

          {/* 最新分地区拆分 */}
          {data.latestBreakdown.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-3">
              <div className="text-xs text-gray-400 mb-2">{data.latestYear} 年分地区主营构成</div>
              <div className="space-y-1.5">
                {data.latestBreakdown.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{r.name}</span>
                    <span className="text-gray-500">
                      {fmtYi(r.income)} · {fmtPct(r.ratio)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 右：机会 / 风险 */}
        <div className="space-y-4">
          {data.markets.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-2">主要出海市场</h3>
              <div className="flex flex-wrap gap-2">
                {data.markets.map((m, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full bg-gray-100 text-sm text-gray-700">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-green-100 bg-green-50/40 p-5">
            <h3 className="font-semibold text-green-800 mb-2">出海机会</h3>
            {data.opportunities.length > 0 ? (
              <ul className="space-y-1.5">
                {data.opportunities.map((o, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="text-green-500">▲</span>
                    <span className="leading-relaxed">{o}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">暂无</p>
            )}
          </div>

          <div className="rounded-xl border border-red-100 bg-red-50/40 p-5">
            <h3 className="font-semibold text-red-800 mb-2">出海风险（地缘 / 汇率 / 竞争）</h3>
            {data.risks.length > 0 ? (
              <ul className="space-y-1.5">
                {data.risks.map((r, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="text-red-400">▼</span>
                    <span className="leading-relaxed">{r}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">暂无</p>
            )}
          </div>
        </div>
      </div>

      {/* 论证 */}
      {data.summary && (
        <div className="mt-5 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-600 leading-relaxed">{data.summary}</p>
        </div>
      )}

      <p className="mt-3 text-xs text-gray-400">
        ⚠️ 海外收入按东财「分地区主营构成」口径，部分公司未披露或口径不一；出海判断为 AI 定性，不构成投资建议。
      </p>
    </section>
  );
}

function SectionHeader() {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="w-1.5 h-6 rounded bg-cyan-500" />
      <h2 className="text-xl font-bold text-gray-900">全球化、出海</h2>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-400 mt-1">{hint}</div>
    </div>
  );
}
