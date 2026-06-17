'use client';

import type {
  EvEbitValuation,
  GeneratedBy,
  PsValuation,
  StrikeZone,
  ValuationMethod,
  ValuationMethodId,
  ValuationSummary as ValuationData,
} from './types';

interface ValuationSummaryProps {
  data: ValuationData | null;
  loading: boolean;
  /** 实时现价（来自行情）；无则回退到生成时快照价。 */
  livePrice?: number | null;
}

const CONFIDENCE_META: Record<ValuationData['confidence'], { label: string; chip: string }> = {
  high: { label: '置信度 高', chip: 'bg-green-50 text-green-700' },
  medium: { label: '置信度 中', chip: 'bg-amber-50 text-amber-700' },
  low: { label: '置信度 低', chip: 'bg-gray-100 text-gray-500' },
};

const GENERATED_BY_META: Record<GeneratedBy, string> = {
  'cursor-dev': '由 Cursor 离线生成',
  ai: 'AI 生成',
  mock: '示例数据',
};

const METHOD_META: Record<ValuationMethodId, { badge: string; desc: string }> = {
  dividend: { badge: '①', desc: '股息率估值' },
  dcf: { badge: '②', desc: 'EV/EBIT 倍数' },
  'earnings-power': { badge: '③', desc: '未来盈利能力' },
  ps: { badge: '④', desc: 'PS 市销率' },
};

/**
 * 安全边际按估值方法定档（击球价 = 合理价值 × 折扣）：
 * - 股息率法：固定打 7 折（安全边际 30%）—— 现金流确定性高
 * - DCF 自由现金流法：固定打 6 折（安全边际 40%）—— 对增长/折现假设敏感
 * - 未来盈利能力法：折扣随确定性而定（周期股约 40%、科技/转型股 50%~80%），
 *   故不固定，取个股 JSON 的 safetyMargin（缺省 40%）。
 */
const FIXED_DISCOUNT: Partial<Record<ValuationMethodId, number>> = {
  dividend: 0.7,
  dcf: 0.6,
};

/** 取某方法的折扣：①②固定，③按个股确定性（dataSafetyMargin）。 */
function discountFor(methodId: ValuationMethodId, dataSafetyMargin: number | null | undefined): number {
  const fixed = FIXED_DISCOUNT[methodId];
  if (fixed != null) return fixed;
  return dataSafetyMargin != null && dataSafetyMargin > 0 ? 1 - dataSafetyMargin : 0.6;
}

const SIGNAL_META: Record<StrikeZone, { label: string; chip: string; dot: string; panel: string }> = {
  undervalued: { label: '击球区 · 低估', chip: 'bg-green-50 text-green-700', dot: 'bg-green-500', panel: 'border-green-200 bg-green-50/40' },
  fair: { label: '合理', chip: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500', panel: 'border-amber-200 bg-amber-50/40' },
  overvalued: { label: '高估 · 观望', chip: 'bg-red-50 text-red-700', dot: 'bg-red-500', panel: 'border-red-200 bg-red-50/40' },
  unknown: { label: '数据不足', chip: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400', panel: 'border-gray-200 bg-gray-50' },
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

/** 信号灯：现价 ≤ 击球价 → 低估；≤ 合理价值 → 合理；否则高估。 */
function computeSignal(price: number | null, fairValue: number | null, strikePrice: number | null): StrikeZone {
  if (price == null || price <= 0 || fairValue == null) return 'unknown';
  if (strikePrice != null && price <= strikePrice) return 'undervalued';
  if (price <= fairValue) return 'fair';
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
          <p className="text-gray-500">估值总结仅对股票池内标的生成。</p>
          <p className="mt-1 text-sm text-gray-400">点击上方「+ 加入选股池」，估值将在后续由脚本 + Cursor 离线生成。</p>
        </div>
      </section>
    );
  }

  if (data.status === 'pending') {
    return (
      <section className="mt-8">
        <SectionHeader />
        <div className="p-6 rounded-xl bg-blue-50/50 border border-blue-100 text-center">
          <p className="text-blue-700 font-medium">已在股票池 · 估值总结待生成</p>
          <p className="mt-1 text-sm text-blue-500">
            开发阶段离线生成 —— 运行{' '}
            <code className="px-1 py-0.5 rounded bg-blue-100 text-blue-700">scripts/valuation_fetch.py {data.code}</code>{' '}
            取现金流 / 分红 / 股本锚点后，由 Cursor 综合三种估值写入 data/valuation/{data.code}.json
          </p>
        </div>
      </section>
    );
  }

  const conf = CONFIDENCE_META[data.confidence];
  const price = livePrice ?? data.snapshotPrice ?? null;
  // 安全边际 / 击球价按推荐方法的折扣计算（①②固定，③按个股确定性）
  const discount = discountFor(data.recommendedMethod, data.safetyMargin);
  const safetyMargin = 1 - discount;
  const strikePrice = data.fairValue != null ? Math.round(data.fairValue * discount * 100) / 100 : null;
  const signal = computeSignal(price, data.fairValue, strikePrice);
  const sig = SIGNAL_META[signal];

  // 现价相对合理价值的偏离（正=高估，负=低估）
  const deviation =
    price != null && data.fairValue != null && data.fairValue > 0
      ? ((price - data.fairValue) / data.fairValue) * 100
      : null;

  return (
    <section className="mt-8">
      <SectionHeader />

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">
          🟨 {GENERATED_BY_META[data.generatedBy]}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
          🟦 现金流 / 分红锚点
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

      {/* 击球区信号灯面板 */}
      <div className={`rounded-xl border-2 p-5 ${sig.panel}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`w-3.5 h-3.5 rounded-full ${sig.dot}`} />
            <div>
              <div className="text-xs text-gray-500">击球区信号</div>
              <div className="text-2xl font-bold text-gray-900">{sig.label}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6 text-center">
            <PriceCell label="现价" value={fmtPrice(price)} accent="text-gray-900" />
            <PriceCell label="击球价" value={fmtPrice(strikePrice)} accent="text-green-700" />
            <PriceCell label="合理价值" value={fmtPrice(data.fairValue)} accent="text-gray-900" />
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
          <span>
            推荐方法：<b className="text-gray-700">{METHOD_META[data.recommendedMethod].badge} {METHOD_META[data.recommendedMethod].desc}</b>
          </span>
          <span>
            安全边际：<b className="text-gray-700">{(safetyMargin * 100).toFixed(0)}%</b>
            <span className="text-gray-400">（{METHOD_META[data.recommendedMethod].desc}打 {(discount * 10).toFixed(0)} 折）</span>
          </span>
          {deviation != null && (
            <span>
              现价较合理价值{' '}
              <b className={deviation > 0 ? 'text-red-600' : 'text-green-600'}>
                {deviation > 0 ? '高' : '低'} {Math.abs(deviation).toFixed(1)}%
              </b>
            </span>
          )}
        </div>
        {data.recommendationReason && (
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">⭐ {data.recommendationReason}</p>
        )}
      </div>

      {/* 估值方法卡片：①② 在上；③盈利能力 与 ④PS 市销率 成组在下（盈利不确定时交叉锚定） */}
      {(() => {
        const renderCard = (m: ValuationMethod) => (
          <MethodCard
            key={m.id}
            method={m}
            recommended={m.id === data.recommendedMethod}
            discount={discountFor(m.id, data.safetyMargin)}
          />
        );
        const isEpPs = (id: ValuationMethodId) => id === 'earnings-power' || id === 'ps';
        const baseMethods = data.methods.filter((m) => !isEpPs(m.id));
        const epPsMethods = data.methods
          .filter((m) => isEpPs(m.id))
          .sort((a, b) => (a.id === 'earnings-power' ? -1 : 1));
        return (
          <div className="mt-5 space-y-4">
            {baseMethods.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{baseMethods.map(renderCard)}</div>
            )}
            {epPsMethods.length > 0 && (
              <div className="rounded-xl border border-gray-100 bg-gray-50/40 p-3">
                <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-xs font-semibold text-gray-600">盈利能力 / 市销率估值</span>
                  <span className="text-[11px] text-gray-400">— 盈利能力不确定时，用前瞻盈利与营收交叉锚定价值</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{epPsMethods.map(renderCard)}</div>
              </div>
            )}
          </div>
        );
      })()}

      {/* 看多 / 看空逻辑 */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-green-100 bg-green-50/40 p-5">
          <h3 className="font-semibold text-green-800 mb-2">看多逻辑</h3>
          {data.bullPoints.length > 0 ? (
            <ul className="space-y-1.5">
              {data.bullPoints.map((p, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700">
                  <span className="text-green-500">▲</span>
                  <span className="leading-relaxed">{p}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">暂无</p>
          )}
        </div>
        <div className="rounded-xl border border-red-100 bg-red-50/40 p-5">
          <h3 className="font-semibold text-red-800 mb-2">看空逻辑</h3>
          {data.bearPoints.length > 0 ? (
            <ul className="space-y-1.5">
              {data.bearPoints.map((p, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700">
                  <span className="text-red-400">▼</span>
                  <span className="leading-relaxed">{p}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">暂无</p>
          )}
        </div>
      </div>

      {/* 参考分位（明确标注非估值依据） */}
      <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="font-medium text-gray-500">参考分位</span>
          <span className="text-gray-600">
            PE 历史分位 <b className="text-gray-800">{data.pePercentile != null ? `${data.pePercentile.toFixed(1)}%` : '—'}</b>
          </span>
          <span className="text-gray-600">
            股息率 <b className="text-gray-800">{data.dividendYield != null ? `${data.dividendYield.toFixed(2)}%` : '—'}</b>
          </span>
          <span className="text-xs text-gray-400">⚠️ 仅供参考，非估值依据（分位高低 ≠ 贵贱）</span>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        ⚠️ 估值含大量主观假设（增长 / 折现 / 目标股息率 / 倍数），结果对假设高度敏感，仅为研究参考，不构成投资建议。
      </p>
    </section>
  );
}

function MethodCard({
  method,
  recommended,
  discount,
}: {
  method: ValuationMethod;
  recommended: boolean;
  discount: number;
}) {
  const meta = METHOD_META[method.id];
  const dim = !method.applicable;
  const methodStrike = method.applicable && method.fairValue != null ? method.fairValue * discount : null;
  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${
        recommended ? 'border-indigo-300 bg-indigo-50/40 ring-1 ring-indigo-200' : 'border-gray-100 bg-white'
      } ${dim ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold">
            {meta.badge}
          </span>
          <span className="font-semibold text-gray-800">{method.name}</span>
        </div>
        {recommended && (
          <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[11px] font-medium whitespace-nowrap">⭐ AI 推荐</span>
        )}
        {dim && !recommended && (
          <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-500 text-[11px] font-medium whitespace-nowrap">不适用</span>
        )}
      </div>

      <div className="mt-2 flex items-end justify-between gap-2">
        <div>
          <div className="text-xs text-gray-400">合理价值（元/股）</div>
          <div className="text-2xl font-bold text-gray-900">
            {method.applicable ? fmtPrice(method.fairValue) : '—'}
          </div>
        </div>
        {methodStrike != null && (
          <div className="text-right">
            <div className="text-xs text-gray-400">击球价 · {(discount * 10).toFixed(0)} 折</div>
            <div className="text-lg font-bold text-green-700">{fmtPrice(methodStrike)}</div>
          </div>
        )}
      </div>

      <p className="mt-2 text-xs text-gray-500 leading-relaxed">{method.applicability}</p>

      {method.assumptions.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-2">
          <div className="text-[11px] text-gray-400 mb-1">关键假设</div>
          <ul className="space-y-1">
            {method.assumptions.map((a, i) => (
              <li key={i} className="text-xs text-gray-600 leading-relaxed flex gap-1.5">
                <span className="text-gray-300">·</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {method.evEbit && <EvEbitBlock ev={method.evEbit} />}

      {method.ps && <PsBlock ps={method.ps} />}
    </div>
  );
}

/** PS 市销率估值测算桥：合理 PS × 常态营收 → 合理市值 ÷ 股本（股权口径，不调净负债）。 */
function PsBlock({ ps }: { ps: PsValuation }) {
  const fairMcap = ps.fairPs * ps.revenueYi;
  const premium = ps.fairPs >= ps.currentPs;
  return (
    <div className="mt-3 border-t border-dashed border-gray-200 pt-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-medium text-gray-500">PS 测算</span>
        <span className="text-[10px] text-gray-400">
          合理 <b className="text-indigo-600">{ps.fairPs}×</b>
          <span className="mx-1 text-gray-300">·</span>
          当前 <b className={premium ? 'text-green-600' : 'text-red-500'}>{ps.currentPs}×</b>
        </span>
      </div>
      <div className="space-y-0.5 text-[11px] text-gray-600">
        <BridgeRow label={`合理 PS ${ps.fairPs}× × 常态营收 ${Math.round(ps.revenueYi)}亿`} value={`${Math.round(fairMcap)} 亿`} strong />
        <BridgeRow label={`= 合理市值 ÷ ${ps.sharesYi}亿股`} value={`${Math.round(fairMcap)} 亿`} divider />
      </div>
      <p className="mt-1 text-[10px] text-gray-400">营收口径：{ps.revenueBasis}</p>
    </div>
  );
}

/** EV/EBIT 倍数估值测算桥：合理倍数 × 常态EBIT → 合理EV → 扣净负债/少数股东权益 → ÷股本。 */
function EvEbitBlock({ ev }: { ev: EvEbitValuation }) {
  const equityYi = ev.fairEvYi - ev.netDebtYi - ev.minorityYi;
  const fmtYi = (v: number) => `${v >= 0 ? '' : '−'}${Math.abs(Math.round(v))} 亿`;
  const premium = ev.fairMultiple >= ev.currentMultiple;
  return (
    <div className="mt-3 border-t border-dashed border-gray-200 pt-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-medium text-gray-500">EV/EBIT 测算</span>
        <span className="text-[10px] text-gray-400">
          合理 <b className="text-indigo-600">{ev.fairMultiple}×</b>
          <span className="mx-1 text-gray-300">·</span>
          当前 <b className={premium ? 'text-green-600' : 'text-red-500'}>{ev.currentMultiple}×</b>
        </span>
      </div>

      <div className="space-y-0.5 text-[11px] text-gray-600">
        <BridgeRow label={`合理倍数 ${ev.fairMultiple}× × 常态EBIT ${Math.round(ev.ebitYi)}亿`} value={fmtYi(ev.fairEvYi)} strong />
        <BridgeRow label={ev.netDebtYi >= 0 ? '− 净负债' : '＋ 净现金'} value={fmtYi(-ev.netDebtYi)} />
        <BridgeRow label="− 少数股东权益" value={fmtYi(-ev.minorityYi)} />
        <BridgeRow label={`= 股权价值 ÷ ${ev.sharesYi}亿股`} value={fmtYi(equityYi)} divider />
      </div>
      <p className="mt-1 text-[10px] text-gray-400">EBIT 口径：{ev.ebitBasis}</p>
    </div>
  );
}

function BridgeRow({
  label,
  value,
  strong,
  divider,
}: {
  label: string;
  value: string;
  strong?: boolean;
  divider?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-2 ${divider ? 'border-t border-gray-100 pt-0.5 mt-0.5' : ''}`}>
      <span className={strong ? 'text-gray-700' : ''}>{label}</span>
      <span className={`tabular-nums ${strong || divider ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>{value}</span>
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
      <h2 className="text-xl font-bold text-gray-900">估值总结 · 三种方法 + 击球区 ⭐</h2>
    </div>
  );
}
