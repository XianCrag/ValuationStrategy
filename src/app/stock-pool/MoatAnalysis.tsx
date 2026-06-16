'use client';

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts';
import type { GeneratedBy, MoatAnalysis as MoatData, MoatStrength } from './types';

interface MoatAnalysisProps {
  data: MoatData | null;
  loading: boolean;
}

const CONFIDENCE_META: Record<MoatData['confidence'], { label: string; chip: string }> = {
  high: { label: '置信度 高', chip: 'bg-green-50 text-green-700' },
  medium: { label: '置信度 中', chip: 'bg-amber-50 text-amber-700' },
  low: { label: '置信度 低', chip: 'bg-gray-100 text-gray-500' },
};

const GENERATED_BY_META: Record<GeneratedBy, string> = {
  'cursor-dev': '由 Cursor 离线生成',
  ai: 'AI 生成',
  mock: '示例数据',
};

const STRENGTH_META: Record<MoatStrength, { label: string; chip: string }> = {
  wide: { label: '宽护城河', chip: 'bg-green-50 text-green-700' },
  moderate: { label: '中等护城河', chip: 'bg-amber-50 text-amber-700' },
  narrow: { label: '窄 / 弱护城河', chip: 'bg-gray-100 text-gray-600' },
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('zh-CN', { hour12: false });
  } catch {
    return iso;
  }
}

export default function MoatAnalysis({ data, loading }: MoatAnalysisProps) {
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
          <p className="text-gray-500">护城河分析仅对股票池内标的生成。</p>
          <p className="mt-1 text-sm text-gray-400">点击上方「+ 加入选股池」，分析将在后续由 Cursor 离线生成。</p>
        </div>
      </section>
    );
  }

  if (data.status === 'pending') {
    return (
      <section className="mt-8">
        <SectionHeader />
        <div className="p-6 rounded-xl bg-blue-50/50 border border-blue-100 text-center">
          <p className="text-blue-700 font-medium">已在股票池 · 护城河分析待生成</p>
          <p className="mt-1 text-sm text-blue-500">
            🟨 五维定性评分，由 Cursor 结合财报 / 研发数据 / 研报后写入 data/moat/{data.code}.json
          </p>
        </div>
      </section>
    );
  }

  const conf = CONFIDENCE_META[data.confidence];
  const strength = STRENGTH_META[data.strength];
  const radarData = data.dimensions.map((d) => ({ dimension: d.name, score: d.score }));

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 雷达图 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`px-2.5 py-1 rounded-full text-sm font-semibold ${strength.chip}`}>{strength.label}</span>
          </div>
          <p className="text-xs text-gray-400 mb-2">五维评分（0~5 分，越靠外越强）</p>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData} outerRadius="72%">
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12, fill: '#374151' }} />
              <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10, fill: '#9ca3af' }} tickCount={6} />
              <Radar
                name="护城河"
                dataKey="score"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.35}
                isAnimationActive={false}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* 维度依据 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-3">维度评分依据</h3>
          <div className="space-y-3">
            {data.dimensions.map((d, i) => (
              <div key={i}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-700">{d.name}</span>
                  <span className="text-sm font-bold text-indigo-600">{d.score.toFixed(1)}</span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
                  <div
                    className="h-1.5 rounded-full bg-indigo-500"
                    style={{ width: `${Math.max(0, Math.min(100, (d.score / 5) * 100))}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">{d.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 论证 */}
      {data.summary && (
        <div className="mt-5 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-600 leading-relaxed">{data.summary}</p>
        </div>
      )}

      {/* 竞争对手对比 */}
      {data.competitors.length > 0 && (
        <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/40 p-5">
          <h3 className="font-semibold text-indigo-900 mb-2">主要竞争对手对比</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.competitors.map((c, i) => (
              <div key={i} className="rounded-lg bg-white/70 p-3">
                <div className="text-sm font-medium text-gray-800">{c.name}</div>
                <div className="text-xs text-gray-500 mt-1 leading-relaxed">{c.note}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-gray-400">⚠️ 护城河评分为 AI 定性判断，仅供参考，不构成投资建议。</p>
    </section>
  );
}

function SectionHeader() {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="w-1.5 h-6 rounded bg-indigo-500" />
      <h2 className="text-xl font-bold text-gray-900">市场竞争力 / 护城河 / 技术创新</h2>
    </div>
  );
}
