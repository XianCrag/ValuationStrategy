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

/**
 * 行业 → 投资大类映射：把细分行业（如「白酒Ⅱ」「家用电器」）归并到顶层板块，
 * 便于按「消费 / 金融地产 / 资源周期 / 医药 / 科技制造」分组浏览。
 * 关键词匹配，新加入个股按其行业名自动归类，未命中归「其他」。
 */
const CATEGORY_RULES: Array<{ category: string; keywords: string[] }> = [
  {
    category: '消费',
    keywords: ['白酒', '食品', '饮料', '啤酒', '乳', '调味', '家用电器', '家电', '纺织', '服饰', '服装', '商贸', '零售', '社会服务', '旅游', '酒店', '餐饮', '美容', '护理', '化妆品', '个护', '养殖', '农林牧渔', '农牧', '种植', '饲料', '家居', '轻工', '消费'],
  },
  { category: '医药', keywords: ['医药', '生物', '医疗', '中药', '化学制药', '器械'] },
  { category: '科技', keywords: ['电子', '半导体', '计算机', '软件', '通信', '传媒', '元件', '光模块', '消费电子', '互联网'] },
  {
    category: '制造业',
    keywords: ['汽车', '乘用车', '商用车', '造纸', '电池', '机械', '电力设备', '电气', '光伏', '军工', '国防', '新能源', '设备', '仪器仪表', '汽车零部件', '船舶', '重工', '工程机械', '专用设备', '通用设备', '制造', '装备'],
  },
  { category: '资源周期', keywords: ['煤炭', '石油', '石化', '有色', '金属', '钢铁', '化工', '化学', '建材', '水泥', '航运', '港口', '采掘', '能源', '电力', '公用', '采矿', "工业金属"] },
  { category: '金融地产', keywords: ['银行', '保险', '证券', '券商', '金融', '房地产', '地产'] },
];

const CATEGORY_ORDER = ['消费', '医药', '科技', '制造业', '资源周期', '金融地产', '其他'];

function industryCategory(industry: string): string {
  const ind = industry || '';
  for (const { category, keywords } of CATEGORY_RULES) {
    if (keywords.some((k) => ind.includes(k))) return category;
  }
  return '其他';
}

interface PoolListProps {
  items: PoolEntry[];
  loading: boolean;
  onRemove: (code: string) => void;
  onSelect?: (code: string) => void;
}

export default function PoolList({ items, loading, onRemove, onSelect }: PoolListProps) {
  // 按投资大类分组（消费 / 金融地产 / 资源周期 …），组内按行业、再按代码排序
  const groups = new Map<string, PoolEntry[]>();
  for (const item of items) {
    const key = industryCategory(item.industry);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  const sortedGroups = Array.from(groups.entries()).sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a[0]);
    const ib = CATEGORY_ORDER.indexOf(b[0]);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
  for (const [, list] of sortedGroups) {
    list.sort((a, b) => (a.industry || '').localeCompare(b.industry || '', 'zh-Hans-CN') || a.code.localeCompare(b.code));
  }

  return (
    <section className="mt-12">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">我的选股池</h2>
          <p className="text-sm text-gray-500 mt-1">按投资大类分组 · 共 {items.length} 只</p>
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
          {sortedGroups.map(([category, list]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-base font-semibold text-gray-800">{category}</h3>
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
                      className={`group bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition ${onSelect ? 'cursor-pointer hover:border-blue-200' : ''
                        }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{item.name}</span>
                            <span className="text-xs text-gray-400 font-mono">{item.code}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${zone.chip}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${zone.dot}`} />
                              {zone.label}
                            </span>
                            {item.industry && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                {item.industry}
                              </span>
                            )}
                          </div>
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
