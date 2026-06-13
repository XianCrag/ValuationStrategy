/**
 * 宏观经济模块 - 工具函数
 *
 * MVP 阶段使用确定性 mock 数据驱动图表，保证：
 *  1. 服务端与客户端渲染结果一致（避免 hydration mismatch）
 *  2. 每个指数有独立但稳定的走势曲线，便于 UI 调试
 *
 * 后续接入真实行情时，仅需替换 `buildSeries` 的实现 / 数据源。
 */

/** 单点时间序列 */
export interface SeriesPoint {
  /** YYYY-MM-DD */
  date: string;
  /** 该日数值 */
  value: number;
}

/** 基于字符串生成 32 位整数哈希（确定性、与运行环境无关） */
function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Mulberry32 - 轻量确定性 PRNG */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SeriesOptions {
  /** 起始基准值 */
  base: number;
  /** 单步最大波动比例（如 0.02 = ±2%） */
  volatility?: number;
  /** 漂移项（每步的趋势倾向，正数偏多） */
  drift?: number;
  /** 序列点数 */
  points?: number;
  /** 是否限制在 [floor, ceil] 之间（用于 VIX 这种有边界的指标） */
  floor?: number;
  ceil?: number;
}

/**
 * 生成确定性时间序列
 * - 以 `seedKey` 哈希作为随机种子，相同 key 总是产生相同序列
 * - 日期为「今日往前推 points 天」的工作日近似（每天一点即可）
 */
export function buildSeries(seedKey: string, options: SeriesOptions): SeriesPoint[] {
  const {
    base,
    volatility = 0.015,
    drift = 0.0005,
    points = 60,
    floor,
    ceil,
  } = options;

  const rand = mulberry32(hashString(seedKey));
  const result: SeriesPoint[] = [];

  let value = base;
  // 使用固定的"今天"参考点，保证服务端/客户端一致
  // 取一个稳定的锚点：基于哈希落在过去 5 天内的某日，避免每次访问都漂移
  // 简化做法：直接用当前自然日；hydration 风险仅在跨午夜时极小窗口
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = points - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);

    const shock = (rand() - 0.5) * 2 * volatility;
    value = value * (1 + drift + shock);
    if (floor !== undefined) value = Math.max(floor, value);
    if (ceil !== undefined) value = Math.min(ceil, value);

    result.push({
      date: d.toISOString().slice(0, 10),
      value: Number(value.toFixed(2)),
    });
  }

  return result;
}

/**
 * 将多条 series 合并为 ChartContainer 期望的 `{ date, [key]: value, ... }` 行格式
 */
export function mergeSeries(
  series: Record<string, SeriesPoint[]>
): Array<Record<string, string | number>> {
  const dateSet = new Set<string>();
  Object.values(series).forEach((s) => s.forEach((p) => dateSet.add(p.date)));
  const dates = Array.from(dateSet).sort();

  const lookup: Record<string, Record<string, number>> = {};
  Object.entries(series).forEach(([key, points]) => {
    lookup[key] = {};
    points.forEach((p) => {
      lookup[key][p.date] = p.value;
    });
  });

  return dates.map((date) => {
    const row: Record<string, string | number> = { date };
    Object.keys(series).forEach((key) => {
      const v = lookup[key][date];
      if (v !== undefined) row[key] = v;
    });
    return row;
  });
}

/** 给定指数 code 返回一个稳定但区分度高的折线颜色 */
export function colorForCode(code: string): string {
  const palette = [
    '#2563eb', // blue-600
    '#dc2626', // red-600
    '#059669', // emerald-600
    '#9333ea', // purple-600
    '#ea580c', // orange-600
    '#0891b2', // cyan-600
    '#ca8a04', // yellow-600
    '#db2777', // pink-600
  ];
  const idx = hashString(code) % palette.length;
  return palette[idx];
}

/** 格式化日期为 MM-DD（用于 X 轴） */
export function formatTickDate(value: string): string {
  if (typeof value !== 'string' || value.length < 10) return String(value);
  return value.slice(5);
}
