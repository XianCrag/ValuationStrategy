'use client';

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts';
import type {
  GeneratedBy,
  ScoreDimension,
  ScoreDimensionId,
  ScorecardAnalysis as ScorecardData,
} from './types';

interface ScorecardProps {
  data: ScorecardData | null;
  loading: boolean;
}

const CONFIDENCE_META: Record<ScorecardData['confidence'], { label: string; chip: string }> = {
  high: { label: '置信度 高', chip: 'bg-green-50 text-green-700' },
  medium: { label: '置信度 中', chip: 'bg-amber-50 text-amber-700' },
  low: { label: '置信度 低', chip: 'bg-gray-100 text-gray-500' },
};

const GENERATED_BY_META: Record<GeneratedBy, string> = {
  'cursor-dev': '由 Cursor 离线生成',
  ai: 'AI 生成',
  mock: '示例数据',
};

/** 维度配色 + 口径说明（周期性为「越高越弱周期」的反向口径）。 */
const DIM_META: Record<ScoreDimensionId, { color: string; bar: string; hint: string }> = {
  stability: { color: 'text-emerald-600', bar: 'bg-emerald-500', hint: '商业模式+护城河 · 分红稳定 · 财务状况' },
  growth: { color: 'text-indigo-600', bar: 'bg-indigo-500', hint: '行业空间 · 资本开支 · 技术创新' },
  cyclicality: { color: 'text-amber-600', bar: 'bg-amber-500', hint: '行业周期 · 股价周期（分数越高=周期性越弱）' },
};

/** 维度评级（口径：分数越高越好；周期性高分=弱周期）。 */
function ratingFor(id: ScoreDimensionId, score: number): { label: string; chip: string } {
  if (id === 'cyclicality') {
    if (score >= 4) return { label: '弱周期', chip: 'bg-green-50 text-green-700' };
    if (score >= 2.5) return { label: '中周期', chip: 'bg-amber-50 text-amber-700' };
    return { label: '强周期', chip: 'bg-red-50 text-red-700' };
  }
  const noun = id === 'stability' ? '稳定性' : '成长性';
  if (score >= 4) return { label: `${noun}强`, chip: 'bg-green-50 text-green-700' };
  if (score >= 3) return { label: `${noun}中`, chip: 'bg-amber-50 text-amber-700' };
  return { label: `${noun}偏弱`, chip: 'bg-gray-100 text-gray-600' };
}

function overallChip(score: number): string {
  if (score >= 4) return 'bg-green-50 text-green-700';
  if (score >= 3) return 'bg-amber-50 text-amber-700';
  return 'bg-gray-100 text-gray-600';
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('zh-CN', { hour12: false });
  } catch {
    return iso;
  }
}

export default function Scorecard({ data, loading }: ScorecardProps) {
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
          <p className="text-gray-500">企业综合评分仅对股票池内标的生成。</p>
          <p className="mt-1 text-sm text-gray-400">点击上方「+ 加入选股池」，评分将在后续由 Cursor 离线生成。</p>
        </div>
      </section>
    );
  }

  if (data.status === 'pending') {
    return (
      <section className="mt-8">
        <SectionHeader />
        <div className="p-6 rounded-xl bg-blue-50/50 border border-blue-100 text-center">
          <p className="text-blue-700 font-medium">已在股票池 · 企业综合评分待生成</p>
          <p className="mt-1 text-sm text-blue-500">
            🟨 三维定性评分，由 Cursor 综合护城河 / 周期 / 股东回报 / 财务后写入 data/scorecard/{data.code}.json
          </p>
        </div>
      </section>
    );
  }

  const conf = CONFIDENCE_META[data.confidence];
  const radarData = data.dimensions.map((d) => ({ dimension: d.name, score: d.score }));
  const overall = data.overallScore;

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

      {/* 综合评分 + 三维雷达 */}
      <div className="rounded-xl border-2 border-violet-200 bg-violet-50/40 p-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-center">
          <div>
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <div className="text-xs text-gray-500">综合评分</div>
                <div className="text-4xl font-bold text-gray-900">
                  {overall != null ? overall.toFixed(1) : '—'}
                  <span className="text-lg font-medium text-gray-400"> / 5</span>
                </div>
              </div>
              {data.profileTag && (
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${overall != null ? overallChip(overall) : 'bg-gray-100 text-gray-600'}`}>
                  {data.profileTag}
                </span>
              )}
            </div>
            <p className="mt-3 text-sm text-gray-600 leading-relaxed">{data.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.dimensions.map((d) => {
                const r = ratingFor(d.id, d.score);
                return (
                  <span key={d.id} className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.chip}`}>
                    {d.name} {d.score.toFixed(1)} · {r.label}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="bg-white/70 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-1 text-center">三维评分（0~5，越靠外越优）</p>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData} outerRadius="70%">
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12, fill: '#374151' }} />
                <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10, fill: '#9ca3af' }} tickCount={6} />
                <Radar
                  name="评分"
                  dataKey="score"
                  stroke="#7c3aed"
                  fill="#7c3aed"
                  fillOpacity={0.35}
                  isAnimationActive={false}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 三维拆解卡片 */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.dimensions.map((d) => (
          <DimensionCard key={d.id} dim={d} />
        ))}
      </div>

      <p className="mt-3 text-xs text-gray-400">
        ⚠️ 评分为 AI 定性判断（口径：分数越高越利于价值投资；周期性高分代表周期性越弱），仅供参考，不构成投资建议。
      </p>
    </section>
  );
}

function DimensionCard({ dim }: { dim: ScoreDimension }) {
  const meta = DIM_META[dim.id];
  const rating = ratingFor(dim.id, dim.score);
  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm p-4">
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <span className="font-semibold text-gray-800">{dim.name}</span>
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${rating.chip}`}>{rating.label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${meta.color}`}>{dim.score.toFixed(1)}</span>
        <span className="text-xs text-gray-400">/ 5</span>
      </div>
      <p className="text-[11px] text-gray-400 mt-0.5">{meta.hint}</p>

      <div className="mt-3 space-y-2.5 border-t border-gray-100 pt-3">
        {dim.factors.map((f, i) => (
          <div key={i}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-gray-700">{f.name}</span>
              <span className="text-sm font-bold text-gray-700">{f.score.toFixed(1)}</span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
              <div
                className={`h-1.5 rounded-full ${meta.bar}`}
                style={{ width: `${Math.max(0, Math.min(100, (f.score / 5) * 100))}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500 leading-relaxed">{f.note}</p>
          </div>
        ))}
      </div>

      {dim.summary && <p className="mt-3 text-xs text-gray-600 leading-relaxed border-t border-gray-100 pt-2">{dim.summary}</p>}
    </div>
  );
}

function SectionHeader() {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="w-1.5 h-6 rounded bg-violet-500" />
      <h2 className="text-xl font-bold text-gray-900">企业综合评分 · 稳定性 / 成长性 / 周期性</h2>
    </div>
  );
}
