'use client';

import type {
  BusinessAnalysis as BusinessAnalysisData,
  GeneratedBy,
  ProductDependency,
  RevenueSource,
  TrendDirection,
} from './types';

interface BusinessAnalysisProps {
  data: BusinessAnalysisData | null;
  loading: boolean;
}

const CONFIDENCE_META: Record<BusinessAnalysisData['confidence'], { label: string; chip: string }> = {
  high: { label: '置信度 高', chip: 'bg-green-50 text-green-700' },
  medium: { label: '置信度 中', chip: 'bg-amber-50 text-amber-700' },
  low: { label: '置信度 低', chip: 'bg-gray-100 text-gray-500' },
};

const GENERATED_BY_META: Record<GeneratedBy, string> = {
  'cursor-dev': '由 Cursor 离线生成',
  ai: 'AI 生成',
  mock: '示例数据',
};

const TREND_META: Record<TrendDirection, { color: string; arrow: string }> = {
  up: { color: 'text-red-600', arrow: '↑' },
  flat: { color: 'text-gray-500', arrow: '→' },
  down: { color: 'text-green-600', arrow: '↓' },
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('zh-CN', { hour12: false });
  } catch {
    return iso;
  }
}

export default function BusinessAnalysis({ data, loading }: BusinessAnalysisProps) {
  if (loading) {
    return (
      <section className="mt-8">
        <SectionHeader />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </section>
    );
  }

  if (!data) return null;

  // 未入池：不展示分析，提示加入后生成
  if (data.status === 'not-in-pool') {
    return (
      <section className="mt-8">
        <SectionHeader />
        <div className="p-6 rounded-xl border-2 border-dashed border-gray-200 text-center">
          <p className="text-gray-500">业务分析仅对股票池内标的生成。</p>
          <p className="mt-1 text-sm text-gray-400">
            点击上方「+ 加入选股池」，分析将在后续由脚本离线生成。
          </p>
        </div>
      </section>
    );
  }

  // 已入池但待生成
  if (data.status === 'pending') {
    return (
      <section className="mt-8">
        <SectionHeader />
        <div className="p-6 rounded-xl bg-blue-50/50 border border-blue-100 text-center">
          <p className="text-blue-700 font-medium">已在股票池 · 业务分析待生成</p>
          <p className="mt-1 text-sm text-blue-500">
            开发阶段由脚本离线生成 —— 运行 <code className="px-1 py-0.5 rounded bg-blue-100 text-blue-700">scripts/business_fetch.py {data.code}</code> 取素材后写入 data/business/{data.code}.json
          </p>
        </div>
      </section>
    );
  }

  // ready
  const conf = CONFIDENCE_META[data.confidence];

  return (
    <section className="mt-8">
      <SectionHeader />

      {/* 来源 / 置信度 / 时间 元信息条 */}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">
          🟨 {GENERATED_BY_META[data.generatedBy]}
        </span>
        <span className={`px-2 py-0.5 rounded-full font-medium ${conf.chip}`}>{conf.label}</span>
        {data.reportPeriod && (
          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
            截止 {data.reportPeriod}
          </span>
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
        <BusinessModelCard segments={data.segments} />
        <RevenueBreakdownCard revenues={data.revenues} />
      </div>

      {data.dependency && <ProductDependencyCallout dependency={data.dependency} />}

      <p className="mt-3 text-xs text-gray-400">
        ⚠️ 以上为基于公开财报 / F10 / 研报的定性归纳，占比为估算值，不构成投资建议，请结合原始披露核实。
      </p>
    </section>
  );
}

function SectionHeader() {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="w-1.5 h-6 rounded bg-blue-500" />
      <h2 className="text-xl font-bold text-gray-900">业务分析 · 企业画像与商业模式定位</h2>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100">
        <span className="text-blue-500">{icon}</span>
        <h3 className="font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function BusinessModelCard({ segments }: { segments: BusinessAnalysisData['segments'] }) {
  return (
    <Card
      title="业务模式分类"
      icon={
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      }
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
            <th className="pb-2 font-medium w-28">业务板块</th>
            <th className="pb-2 font-medium w-24">定位</th>
            <th className="pb-2 font-medium">特征</th>
          </tr>
        </thead>
        <tbody>
          {segments.map((s, i) => (
            <tr key={i} className="border-b border-gray-50 last:border-0 align-top">
              <td className="py-3 pr-2 font-semibold text-gray-900">{s.name}</td>
              <td className="py-3 pr-2">
                <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium whitespace-nowrap">
                  {s.position}
                </span>
              </td>
              <td className="py-3 text-gray-600 leading-relaxed">{s.features}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function RevenueBreakdownCard({ revenues }: { revenues: RevenueSource[] }) {
  return (
    <Card
      title="收入结构拆解"
      icon={
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
        </svg>
      }
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
            <th className="pb-2 font-medium">收入来源</th>
            <th className="pb-2 font-medium w-28">
              占比{revenues[0]?.shareYear && revenues[0].shareYear !== '—' ? `（${revenues[0].shareYear}年）` : ''}
            </th>
            <th className="pb-2 font-medium">趋势</th>
          </tr>
        </thead>
        <tbody>
          {revenues.map((r, i) => {
            const trend = TREND_META[r.trendDirection];
            return (
              <tr key={i} className="border-b border-gray-50 last:border-0 align-top">
                <td className="py-3 pr-2 text-gray-700">{r.source}</td>
                <td className="py-3 pr-2 font-semibold text-gray-900">{r.share}</td>
                <td className={`py-3 font-medium leading-relaxed ${trend.color}`}>
                  <span className="mr-1">{trend.arrow}</span>
                  {r.trend}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

function ProductDependencyCallout({ dependency }: { dependency: ProductDependency }) {
  return (
    <div className="mt-5 flex gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
      <span className="text-amber-500 text-lg leading-none mt-0.5">⚠️</span>
      <div className="text-sm">
        <div className="font-semibold text-amber-900">
          单一产品依赖度：前 {dependency.topN} 大产品占营收 {dependency.share}
        </div>
        <div className="mt-1 text-amber-800 leading-relaxed">{dependency.detail}</div>
        <div className="mt-1 text-amber-700 leading-relaxed">{dependency.note}</div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="h-5 w-32 bg-gray-100 rounded animate-pulse mb-4" />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-4 w-full bg-gray-50 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}
