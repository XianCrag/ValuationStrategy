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
  GeneratedBy,
  ShareholderAnalysis as ShareholderData,
  ShareholderRating,
} from './types';

interface ShareholderReturnProps {
  data: ShareholderData | null;
  loading: boolean;
}

const CONFIDENCE_META: Record<ShareholderData['confidence'], { label: string; chip: string }> = {
  high: { label: '置信度 高', chip: 'bg-green-50 text-green-700' },
  medium: { label: '置信度 中', chip: 'bg-amber-50 text-amber-700' },
  low: { label: '置信度 低', chip: 'bg-gray-100 text-gray-500' },
};

const GENERATED_BY_META: Record<GeneratedBy, string> = {
  'cursor-dev': '由 Cursor 离线生成',
  ai: 'AI 生成',
  mock: '示例数据',
};

const RATING_META: Record<ShareholderRating, { label: string; chip: string }> = {
  strong: { label: '回报力度 强', chip: 'bg-green-50 text-green-700' },
  moderate: { label: '回报力度 中', chip: 'bg-amber-50 text-amber-700' },
  weak: { label: '回报力度 弱 / 周期波动', chip: 'bg-gray-100 text-gray-600' },
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

export default function ShareholderReturn({ data, loading }: ShareholderReturnProps) {
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
          <p className="text-gray-500">股东回报分析仅对股票池内标的生成。</p>
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
          <p className="text-blue-700 font-medium">已在股票池 · 股东回报分析待生成</p>
          <p className="mt-1 text-sm text-blue-500">
            开发阶段由脚本离线生成 —— 运行{' '}
            <code className="px-1 py-0.5 rounded bg-blue-100 text-blue-700">scripts/shareholder_fetch.py {data.code}</code>{' '}
            取分红序列后写入 data/shareholder/{data.code}.json
          </p>
        </div>
      </section>
    );
  }

  const conf = CONFIDENCE_META[data.confidence];
  const rating = RATING_META[data.rating];

  const chartData = data.annual.map((p) => ({
    year: p.year,
    分红额: p.dividend,
    派息比例: p.payoutRatio,
  }));

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

      {/* KPI 卡 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="当前股息率" value={fmtPct(data.currentDividendYield, 2)} hint="最新年度分红 / 市值" />
        <Kpi label="派息比例" value={fmtPct(data.payoutRatioLatest)} hint="分红 / 归母净利" />
        <Kpi label="连续分红年数" value={data.consecutiveYears == null ? '—' : `${data.consecutiveYears} 年`} hint="现金分红连续性" />
        <Kpi label="累计现金分红" value={fmtYi(data.cumulativeDividend)} hint="近 12 年合计" />
      </div>

      {/* 与市值 / 净利润的关系 */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Relation
          label="累计分红 / 市值"
          value={fmtPct(data.cumulativeToMcap)}
          desc={`历史累计派现已相当于当前市值（${fmtYi(data.mcapYi)}）的占比`}
        />
        <Relation label="分红 / 净利润" value={fmtPct(data.payoutRatioLatest)} desc="最新年度分红占归母净利比重（即派息比例）" />
      </div>

      {/* 历年分红额 + 派息比例 */}
      <div className="mt-5 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-1">历年现金分红 / 派息比例</h3>
        <p className="text-xs text-gray-400 mb-4">柱：年度现金分红（亿元，左轴）｜线：派息比例（%，右轴）</p>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              formatter={(value: number, name: string) =>
                name === '派息比例' ? [`${value}%`, name] : [`${value} 亿`, name]
              }
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="left" dataKey="分红额" fill="#34d399" radius={[2, 2, 0, 0]} isAnimationActive={false} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="派息比例"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 回购 + 评价 */}
      <div className="mt-5 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={`px-2.5 py-1 rounded-full text-sm font-semibold ${rating.chip}`}>{rating.label}</span>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">{data.summary}</p>
        {data.buybackNote && (
          <div className="mt-3 flex gap-2 p-3 rounded-lg bg-gray-50 text-sm">
            <span className="font-medium text-gray-700 whitespace-nowrap">回购</span>
            <span className="text-gray-600 leading-relaxed">{data.buybackNote}</span>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-gray-400">
        ⚠️ 各比率以「生成时市值」为分母快照；A 股无统一回购数据接口，回购为定性说明。不构成投资建议。
      </p>
    </section>
  );
}

function SectionHeader() {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="w-1.5 h-6 rounded bg-emerald-500" />
      <h2 className="text-xl font-bold text-gray-900">股东回报 · 分红 / 回购 与 市值、收入的关系</h2>
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

function Relation({ label, value, desc }: { label: string; value: string; desc: string }) {
  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-emerald-800">{label}</span>
        <span className="text-xl font-bold text-emerald-700">{value}</span>
      </div>
      <div className="text-xs text-gray-500 mt-1 leading-relaxed">{desc}</div>
    </div>
  );
}
