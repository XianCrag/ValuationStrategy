'use client';

import { useState } from 'react';
import BusinessAnalysis from './BusinessAnalysis';
import CycleAnalysis from './CycleAnalysis';
import type {
  BusinessAnalysis as BusinessAnalysisData,
  CycleAnalysis as CycleAnalysisData,
  PoolEntry,
  StockQuote,
  StockValuation,
  StrikeZone,
} from './types';

interface StockPoolClientProps {
  pooledCodes: Set<string>;
  onAdd: (entry: PoolEntry) => Promise<void> | void;
}

const EXAMPLES: Array<{ code: string; name: string }> = [
  { code: '600519', name: '贵州茅台' },
  { code: '000858', name: '五粮液' },
  { code: '601088', name: '中国神华' },
];

function formatPrice(v: number): string {
  return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatYi(v: number): string {
  if (v >= 10000) return `${(v / 10000).toFixed(2)} 万亿`;
  return `${v.toFixed(0)} 亿`;
}

const STRIKE_ZONE_META: Record<StrikeZone, { label: string; dot: string; chip: string }> = {
  undervalued: { label: '低估 · 击球区', dot: 'bg-green-500', chip: 'bg-green-50 text-green-700' },
  fair: { label: '合理', dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700' },
  overvalued: { label: '高估 · 观望', dot: 'bg-red-500', chip: 'bg-red-50 text-red-700' },
  unknown: { label: '数据不足', dot: 'bg-gray-400', chip: 'bg-gray-100 text-gray-500' },
};

export default function StockPoolClient({ pooledCodes, onAdd }: StockPoolClientProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [valuation, setValuation] = useState<StockValuation | null>(null);
  const [valLoading, setValLoading] = useState(false);
  const [business, setBusiness] = useState<BusinessAnalysisData | null>(null);
  const [bizLoading, setBizLoading] = useState(false);
  const [cycle, setCycle] = useState<CycleAnalysisData | null>(null);
  const [cycleLoading, setCycleLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  const loadBusiness = async (code: string) => {
    try {
      const r = await fetch(`/api/stock-business?code=${code}`);
      const data = (await r.json()) as BusinessAnalysisData;
      if (data.success) setBusiness(data);
    } catch {
      /* 忽略，保留上一次状态 */
    }
  };

  const loadCycle = async (code: string) => {
    try {
      const r = await fetch(`/api/stock-cycle?code=${code}`);
      const data = (await r.json()) as CycleAnalysisData;
      if (data.success) setCycle(data);
    } catch {
      /* 忽略，保留上一次状态 */
    }
  };

  const search = async (rawCode: string) => {
    const code = rawCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setError('请输入 6 位股票代码');
      return;
    }
    setLoading(true);
    setValLoading(true);
    setBizLoading(true);
    setCycleLoading(true);
    setError(null);
    setValuation(null);
    setBusiness(null);
    setCycle(null);

    // 估值分析较慢，与实时行情并行请求
    fetch(`/api/stock-valuation?code=${code}`)
      .then((r) => r.json())
      .then((data: StockValuation) => {
        if (data.success) setValuation(data);
      })
      .catch(() => {})
      .finally(() => setValLoading(false));

    // 业务分析（§2）/ 周期分析（§4）—— 与股票池对齐，仅池内标的有内容，并行请求
    loadBusiness(code).finally(() => setBizLoading(false));
    loadCycle(code).finally(() => setCycleLoading(false));

    try {
      const res = await fetch(`/api/stock-quote?code=${code}`);
      const data = (await res.json()) as StockQuote;
      if (!data.success) {
        setError(data.error || '获取行情失败');
        setQuote(null);
      } else {
        setQuote(data);
      }
    } catch {
      setError('网络错误，请稍后重试');
      setQuote(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    search(input);
  };

  const handleAdd = async () => {
    if (!quote) return;
    setAdding(true);
    try {
      await onAdd({
        code: quote.code,
        name: quote.name,
        industry: valuation?.industry || '未分类',
        price: quote.price,
        peTtm: quote.peTtm,
        pePercentile: valuation?.pePercentile ?? null,
        dividendYield: valuation?.dividendYield ?? null,
        roe: valuation?.roe ?? null,
        roePeriod: valuation?.roePeriod ?? null,
        strikeZone: valuation?.strikeZone ?? 'unknown',
        addedAt: '',
      });
      // 加入后重取业务/周期分析：not-in-pool → pending（待离线生成）
      await Promise.all([loadBusiness(quote.code), loadCycle(quote.code)]);
    } finally {
      setAdding(false);
    }
  };

  const up = quote ? quote.changePct >= 0 : false;
  const changeColor = up ? 'text-red-600' : 'text-green-600';
  const zone = valuation?.strikeZone ?? 'unknown';
  const zoneMeta = STRIKE_ZONE_META[zone];
  const inPool = quote ? pooledCodes.has(quote.code) : false;

  return (
    <div>
      {/* 搜索框 */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-md">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入 6 位股票代码，如 600519"
              inputMode="numeric"
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
            />
            <svg
              className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? '查询中…' : '分析'}
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400">示例：</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.code}
              type="button"
              onClick={() => {
                setInput(ex.code);
                search(ex.code);
              }}
              className="px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-xs text-gray-700 transition"
            >
              {ex.name} {ex.code}
            </button>
          ))}
        </div>
      </form>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {!quote && !error && !loading && (
        <div className="p-10 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          输入股票代码，查看实时估值概览
        </div>
      )}

      {quote && (
        <>
          {/* 当前标的 */}
          <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900">{quote.name}</h2>
                <span className="text-gray-500 font-mono">{quote.code}</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${zoneMeta.chip}`}
                >
                  <span className={`w-2 h-2 rounded-full ${zoneMeta.dot}`} />
                  {valLoading ? '评估中…' : zoneMeta.label}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                <span className="px-2 py-0.5 rounded bg-gray-100">数据源 · a-stock-data</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={inPool || adding || valLoading}
              title={valLoading ? '等待估值分析完成后再加入，以保存完整快照' : undefined}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                inPool
                  ? 'bg-green-50 text-green-700 border border-green-200 cursor-default'
                  : 'border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-50'
              }`}
            >
              {inPool
                ? '✓ 已在选股池'
                : adding
                ? '加入中…'
                : valLoading
                ? '分析中…'
                : '+ 加入选股池'}
            </button>
          </div>

          {/* 概览卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <OverviewCard label="现价">
              <div className="text-2xl font-bold text-gray-900">{formatPrice(quote.price)}</div>
              <div className={`text-sm font-medium ${changeColor}`}>
                {up ? '+' : ''}
                {quote.changeAmt.toFixed(2)} ({up ? '+' : ''}
                {quote.changePct.toFixed(2)}%)
              </div>
            </OverviewCard>

            <OverviewCard label="PE-TTM">
              <div className="text-2xl font-bold text-gray-900">
                {quote.peTtm > 0 ? quote.peTtm.toFixed(2) : '—'}
              </div>
              <div className="text-sm text-gray-400">PB {quote.pb > 0 ? quote.pb.toFixed(2) : '—'}</div>
            </OverviewCard>

            <OverviewCard label="PE 历史分位">
              {valLoading ? (
                <LoadingValue />
              ) : valuation?.pePercentile != null ? (
                <>
                  <div className="text-2xl font-bold text-gray-900">{valuation.pePercentile.toFixed(1)}%</div>
                  <div className="text-sm text-gray-400">
                    近 {valuation.peWindowYears ?? '—'} 年
                  </div>
                </>
              ) : (
                <EmptyValue hint="历史数据不足" />
              )}
            </OverviewCard>

            <OverviewCard label="股息率">
              {valLoading ? (
                <LoadingValue />
              ) : valuation?.dividendYield != null ? (
                <>
                  <div className="text-2xl font-bold text-gray-900">{valuation.dividendYield.toFixed(2)}%</div>
                  <div className="text-sm text-gray-400">滚动 12 个月</div>
                </>
              ) : (
                <EmptyValue hint="暂无分红" />
              )}
            </OverviewCard>

            <OverviewCard label="ROE">
              {valLoading ? (
                <LoadingValue />
              ) : valuation?.roe != null ? (
                <>
                  <div className="text-2xl font-bold text-gray-900">{valuation.roe.toFixed(2)}%</div>
                  <div className="text-sm text-gray-400">{valuation.roePeriod ?? '—'} 年报</div>
                </>
              ) : (
                <EmptyValue hint="暂无数据" />
              )}
            </OverviewCard>

            <OverviewCard label="击球区状态">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${zoneMeta.chip}`}>
                <span className={`w-2 h-2 rounded-full ${zoneMeta.dot}`} />
                {valLoading ? '评估中…' : zoneMeta.label}
              </span>
              <div className="text-sm text-gray-400 mt-1">基于 PE 分位</div>
            </OverviewCard>
          </div>

          <div className="mt-4 text-xs text-gray-400">
            总市值 {formatYi(quote.mcapYi)} · 换手率 {quote.turnoverPct.toFixed(2)}%
            {valuation?.peComputed != null && (
              <> · 分位口径 PE {valuation.peComputed.toFixed(2)}</>
            )}
          </div>

          {/* 业务分析（RRD_1 §2） */}
          <BusinessAnalysis data={business} loading={bizLoading} />

          {/* 周期分析（RRD_1 §4 周期性） */}
          <CycleAnalysis data={cycle} loading={cycleLoading} />
        </>
      )}
    </div>
  );
}

function OverviewCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="text-xs text-gray-400 mb-2">{label}</div>
      {children}
    </div>
  );
}

function LoadingValue() {
  return (
    <>
      <div className="h-7 w-16 bg-gray-100 rounded animate-pulse" />
      <div className="text-sm text-gray-300 mt-1">计算中…</div>
    </>
  );
}

function EmptyValue({ hint }: { hint: string }) {
  return (
    <>
      <div className="text-2xl font-bold text-gray-300">—</div>
      <div className="text-sm text-gray-400">{hint}</div>
    </>
  );
}
