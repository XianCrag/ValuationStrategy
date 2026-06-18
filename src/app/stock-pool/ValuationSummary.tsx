'use client';

import type {
  StrikeZone,
  ValuationMethod,
  ValuationMethodId,
  ValuationSummary as ValuationData,
} from './types';

interface ValuationSummaryProps {
  data: ValuationData | null;
  loading: boolean;
  /** 实时现价（来自行情）；无则回退到快照价。 */
  livePrice?: number | null;
}

const METHOD_BADGE: Record<ValuationMethodId, string> = {
  dividend: '①',
  dcf: '②',
  'earnings-power': '③',
  ps: '④',
};

const SIGNAL_META: Record<StrikeZone, { label: string; dot: string; panel: string }> = {
  undervalued: { label: '低于击球价', dot: 'bg-green-500', panel: 'border-green-200 bg-green-50/40' },
  fair: { label: '低于中枢 · 合理', dot: 'bg-amber-500', panel: 'border-amber-200 bg-amber-50/40' },
  overvalued: { label: '高于中枢 · 偏贵', dot: 'bg-red-500', panel: 'border-red-200 bg-red-50/40' },
  unknown: { label: '数据不足', dot: 'bg-gray-400', panel: 'border-gray-200 bg-gray-50' },
};

function fmtPrice(v: number | null | undefined): string {
  return v == null ? '—' : v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('zh-CN', { hour12: false });
  } catch {
    return iso;
  }
}

/** 信号灯：现价 ≤ 击球价 → 低估；≤ 中枢 → 合理；否则偏贵。 */
function computeSignal(price: number | null, center: number | null, strike: number | null): StrikeZone {
  if (price == null || price <= 0 || center == null) return 'unknown';
  if (strike != null && price <= strike) return 'undervalued';
  if (price <= center) return 'fair';
  return 'overvalued';
}

export default function ValuationSummary({ data, loading, livePrice }: ValuationSummaryProps) {
  if (loading) {
    return (
      <section className="mt-8">
        <SectionHeader />
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="h-5 w-40 bg-gray-100 rounded animate-pulse mb-4" />
          <div className="h-40 w-full bg-gray-50 rounded animate-pulse" />
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
          <p className="text-gray-500">估值仅对股票池内标的计算。</p>
          <p className="mt-1 text-sm text-gray-400">点击上方「+ 加入选股池」，并运行取数脚本生成财务指标后即按公式自动计算。</p>
        </div>
      </section>
    );
  }

  if (data.status === 'pending') {
    return (
      <section className="mt-8">
        <SectionHeader />
        <div className="p-6 rounded-xl bg-blue-50/50 border border-blue-100 text-center">
          <p className="text-blue-700 font-medium">已在股票池 · 待生成财务指标</p>
          <p className="mt-1 text-sm text-blue-500">
            运行{' '}
            <code className="px-1 py-0.5 rounded bg-blue-100 text-blue-700">
              scripts/valuation_metrics_fetch.py {data.code} &gt; data/financials/{data.code}.json
            </code>{' '}
            后，估值由固定公式自动计算。
          </p>
        </div>
      </section>
    );
  }

  const price = livePrice ?? data.snapshotPrice ?? null;
  const center = data.medianFairValue;
  const strike = center != null ? Math.round(center * (1 - data.safetyMargin) * 100) / 100 : null;
  const signal = computeSignal(price, center, strike);
  const sig = SIGNAL_META[signal];
  const applicable = data.methods.filter((m) => m.applicable && m.fairValue != null);

  return (
    <section className="mt-8">
      <SectionHeader />

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
          ∑ 100% 公式计算
        </span>
        {data.reportPeriod && (
          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">指标截止 {data.reportPeriod}</span>
        )}
        <span className="text-gray-400">来源：{data.source}</span>
        {data.generatedAt && (
          <>
            <span className="text-gray-300">·</span>
            <span className="text-gray-400">取数于 {formatTime(data.generatedAt)}</span>
          </>
        )}
      </div>

      {/* 顶部：各方法估值一览 + 中枢/击球价信号 */}
      <div className={`rounded-xl border-2 p-5 ${sig.panel}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`w-3.5 h-3.5 rounded-full ${sig.dot}`} />
            <div>
              <div className="text-xs text-gray-500">现价 vs 各方法</div>
              <div className="text-2xl font-bold text-gray-900">{sig.label}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6 text-center">
            <PriceCell label="现价" value={fmtPrice(price)} accent="text-gray-900" />
            <PriceCell label="击球价（中枢×7折）" value={fmtPrice(strike)} accent="text-green-700" />
            <PriceCell label="合理价值中枢（中位）" value={fmtPrice(center)} accent="text-gray-900" />
          </div>
        </div>

        {/* 各方法对应的估值 */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {data.methods.map((m) => (
            <MethodChip key={m.id} method={m} price={price} />
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-500">
          合理价值中枢 = 各可计算方法合理价值的中位数；击球价 = 中枢 ×（1 − 安全边际 {(data.safetyMargin * 100).toFixed(0)}%）。均为公式结果，无主观判断。
        </p>
      </div>

      {/* 四种方法公式卡片 */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.methods.map((m) => (
          <MethodCard key={m.id} method={m} safetyMargin={data.safetyMargin} />
        ))}
      </div>

      <p className="mt-3 text-xs text-gray-400">
        ⚠️ 估值由固定公式 + 客观财务指标机械计算（统一倍数 / 目标股息率 / 常态化窗口），不区分行业与个股质地，仅为量化参考，不构成投资建议。
      </p>
    </section>
  );
}

/** 顶部一览：单个方法的合理价值 + 相对现价的高/低。 */
function MethodChip({ method, price }: { method: ValuationMethod; price: number | null }) {
  const fair = method.fairValue;
  const dev = price != null && fair != null && fair > 0 ? ((price - fair) / fair) * 100 : null;
  return (
    <div className={`rounded-lg border bg-white/70 px-2.5 py-2 ${method.applicable ? 'border-gray-200' : 'border-dashed border-gray-200 opacity-60'}`}>
      <div className="flex items-center gap-1 text-[11px] text-gray-500">
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-900 text-white text-[9px] font-bold">
          {METHOD_BADGE[method.id]}
        </span>
        <span className="truncate">{method.name}</span>
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-1">
        <span className="text-lg font-bold text-gray-900">{method.applicable ? fmtPrice(fair) : '—'}</span>
        {dev != null && (
          <span className={`text-[10px] font-medium ${dev > 0 ? 'text-red-500' : 'text-green-600'}`}>
            现价{dev > 0 ? '高' : '低'}{Math.abs(dev).toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}

function MethodCard({ method, safetyMargin }: { method: ValuationMethod; safetyMargin: number }) {
  const dim = !method.applicable;
  return (
    <div className={`rounded-xl border p-4 shadow-sm border-gray-100 bg-white ${dim ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold">
            {METHOD_BADGE[method.id]}
          </span>
          <span className="font-semibold text-gray-800">{method.name}</span>
        </div>
        {dim && (
          <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-500 text-[11px] font-medium whitespace-nowrap">不可计算</span>
        )}
      </div>

      {method.applicable ? (
        <>
          <div className="mt-2 flex items-end justify-between gap-2">
            <div>
              <div className="text-xs text-gray-400">合理价值（元/股）</div>
              <div className="text-2xl font-bold text-gray-900">{fmtPrice(method.fairValue)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">击球价 · {(safetyMargin * 100).toFixed(0)}% 安全边际</div>
              <div className="text-lg font-bold text-green-700">{fmtPrice(method.strikePrice)}</div>
            </div>
          </div>

          <p className="mt-2 text-xs text-indigo-600 leading-relaxed font-medium">{method.formula}</p>

          <div className="mt-2 border-t border-gray-100 pt-2 space-y-0.5">
            {method.rows.map((row, i) => {
              const last = i === method.rows.length - 1;
              return (
                <div
                  key={i}
                  className={`flex items-center justify-between gap-2 text-xs ${last ? 'border-t border-gray-100 pt-1 mt-1' : ''}`}
                >
                  <span className={last ? 'font-medium text-gray-700' : 'text-gray-500'}>{row.label}</span>
                  <span className={`tabular-nums ${last ? 'font-bold text-gray-900' : 'text-gray-600'}`}>{row.value}</span>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <p className="mt-3 text-xs text-gray-500 leading-relaxed">{method.naReason ?? '输入数据不足，无法计算'}</p>
      )}
    </div>
  );
}

function PriceCell({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-lg font-bold ${accent}`}>{value}</div>
    </div>
  );
}

function SectionHeader() {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="w-1.5 h-6 rounded bg-rose-500" />
      <h2 className="text-xl font-bold text-gray-900">估值 · 四方法公式计算</h2>
    </div>
  );
}
