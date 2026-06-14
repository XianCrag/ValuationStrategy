'use client';

import type { PoolEntry, StrikeZone } from './types';

const STRIKE_ZONE_META: Record<StrikeZone, { label: string; dot: string; chip: string }> = {
  undervalued: { label: '低估', dot: 'bg-green-500', chip: 'bg-green-50 text-green-700' },
  fair: { label: '合理', dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700' },
  overvalued: { label: '高估', dot: 'bg-red-500', chip: 'bg-red-50 text-red-700' },
  unknown: { label: '—', dot: 'bg-gray-400', chip: 'bg-gray-100 text-gray-500' },
};

function pct(v: number | null, suffix = '%'): string {
  return v == null ? '—' : `${v.toFixed(suffix === '%' ? 1 : 2)}${suffix}`;
}

interface PoolListProps {
  items: PoolEntry[];
  loading: boolean;
  onRemove: (code: string) => void;
  onSelect?: (code: string) => void;
}

export default function PoolList({ items, loading, onRemove, onSelect }: PoolListProps) {
  // 按行业分组排序
  const groups = new Map<string, PoolEntry[]>();
  for (const item of items) {
    const key = item.industry || '未分类';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  const sortedGroups = Array.from(groups.entries()).sort((a, b) =>
    a[0].localeCompare(b[0], 'zh-Hans-CN')
  );
  for (const [, list] of sortedGroups) {
    list.sort((a, b) => a.code.localeCompare(b.code));
  }

  return (
    <section className="mt-12">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">我的选股池</h2>
          <p className="text-sm text-gray-500 mt-1">按行业分组 · 共 {items.length} 只</p>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="p-10 text-center text-gray-400">加载中…</div>
      ) : items.length === 0 ? (
        <div className="p-10 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          选股池为空 —— 在上方搜索个股并点击「加入选股池」
        </div>
      ) : (
        <div className="space-y-8">
          {sortedGroups.map(([industry, list]) => (
            <div key={industry}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-base font-semibold text-gray-800">{industry}</h3>
                <span className="text-xs text-gray-400">{list.length} 只</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {list.map((item) => {
                  const zone = STRIKE_ZONE_META[item.strikeZone] ?? STRIKE_ZONE_META.unknown;
                  return (
                    <div
                      key={item.code}
                      role={onSelect ? 'button' : undefined}
                      tabIndex={onSelect ? 0 : undefined}
                      onClick={onSelect ? () => onSelect(item.code) : undefined}
                      onKeyDown={
                        onSelect
                          ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onSelect(item.code);
                              }
                            }
                          : undefined
                      }
                      title={onSelect ? '查看分析' : undefined}
                      className={`group bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition ${
                        onSelect ? 'cursor-pointer hover:border-blue-200' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{item.name}</span>
                            <span className="text-xs text-gray-400 font-mono">{item.code}</span>
                          </div>
                          <span
                            className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${zone.chip}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${zone.dot}`} />
                            {zone.label}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemove(item.code);
                          }}
                          className="text-gray-300 hover:text-red-500 transition text-sm opacity-0 group-hover:opacity-100"
                          title="移出选股池"
                          aria-label="移出选股池"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
                        <Metric label="现价" value={item.price == null ? '—' : item.price.toFixed(2)} />
                        <Metric label="PE-TTM" value={item.peTtm == null ? '—' : item.peTtm.toFixed(2)} />
                        <Metric label="PE 分位" value={pct(item.pePercentile)} />
                        <Metric label="股息率" value={pct(item.dividendYield, '%')} />
                        <Metric label="ROE" value={pct(item.roe, '%')} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-400">{label}</div>
      <div className="font-semibold text-gray-900">{value}</div>
    </div>
  );
}
