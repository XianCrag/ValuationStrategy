'use client';

import type {
  GeneratedBy,
  PolicyAnalysis as PolicyData,
  PolicyImpact,
  PolicyStance,
} from './types';

interface PolicyAnalysisProps {
  data: PolicyData | null;
  loading: boolean;
}

const CONFIDENCE_META: Record<PolicyData['confidence'], { label: string; chip: string }> = {
  high: { label: '置信度 高', chip: 'bg-green-50 text-green-700' },
  medium: { label: '置信度 中', chip: 'bg-amber-50 text-amber-700' },
  low: { label: '置信度 低', chip: 'bg-gray-100 text-gray-500' },
};

const GENERATED_BY_META: Record<GeneratedBy, string> = {
  'cursor-dev': '由 Cursor 离线生成',
  ai: 'AI 生成',
  mock: '示例数据',
};

const STANCE_META: Record<PolicyStance, { label: string; chip: string; dot: string }> = {
  tailwind: { label: '政策顺风', chip: 'bg-green-50 text-green-700', dot: 'bg-green-500' },
  neutral: { label: '政策中性', chip: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  headwind: { label: '政策逆风', chip: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
};

const IMPACT_META: Record<PolicyImpact, { label: string; chip: string; dot: string }> = {
  positive: { label: '利好', chip: 'bg-green-50 text-green-700', dot: 'bg-green-500' },
  neutral: { label: '中性', chip: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
  negative: { label: '利空', chip: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('zh-CN', { hour12: false });
  } catch {
    return iso;
  }
}

export default function PolicyAnalysis({ data, loading }: PolicyAnalysisProps) {
  if (loading) {
    return (
      <section className="mt-8">
        <SectionHeader />
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="h-5 w-40 bg-gray-100 rounded animate-pulse mb-4" />
          <div className="h-32 w-full bg-gray-50 rounded animate-pulse" />
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
          <p className="text-gray-500">政策、监管环境分析仅对股票池内标的生成。</p>
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
          <p className="text-blue-700 font-medium">已在股票池 · 政策环境分析待生成</p>
          <p className="mt-1 text-sm text-blue-500">
            🟨 纯定性模块，由 Cursor 综合政策文件 / 行业新闻后写入 data/policy/{data.code}.json
          </p>
        </div>
      </section>
    );
  }

  const conf = CONFIDENCE_META[data.confidence];
  const stance = STANCE_META[data.stance];

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

      {/* 立场 + 论证 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${stance.chip}`}>
            <span className={`w-2 h-2 rounded-full ${stance.dot}`} />
            {stance.label}
          </span>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">{data.summary}</p>
      </div>

      {/* 政策事件时间线 */}
      {data.events.length > 0 && (
        <div className="mt-5 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">关键政策事件时间线</h3>
          <ol className="relative border-l-2 border-gray-100 ml-2">
            {data.events.map((ev, i) => {
              const im = IMPACT_META[ev.impact];
              return (
                <li key={i} className="ml-5 pb-5 last:pb-0">
                  <span className={`absolute -left-[7px] w-3 h-3 rounded-full border-2 border-white ${im.dot}`} />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono text-gray-400">{ev.date}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${im.chip}`}>{im.label}</span>
                    <span className="text-sm font-medium text-gray-800">{ev.title}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600 leading-relaxed">{ev.note}</p>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* 监管 / 政策风险 */}
      {data.risks.length > 0 && (
        <div className="mt-5 rounded-xl border border-red-100 bg-red-50/40 p-5">
          <h3 className="font-semibold text-red-800 mb-2">监管 / 政策风险</h3>
          <ul className="space-y-1.5">
            {data.risks.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700">
                <span className="text-red-400">•</span>
                <span className="leading-relaxed">{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 text-xs text-gray-400">
        ⚠️ 政策解读为 AI 定性判断，可能滞后或存在偏差，不构成投资建议。
      </p>
    </section>
  );
}

function SectionHeader() {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="w-1.5 h-6 rounded bg-sky-500" />
      <h2 className="text-xl font-bold text-gray-900">政策、监管环境</h2>
    </div>
  );
}
