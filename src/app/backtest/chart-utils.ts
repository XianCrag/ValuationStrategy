/**
 * 图表数据优化工具
 * 
 * 用于减少图表上的数据点数量，同时保留关键点位（如交易点）
 * 使图表渲染更流畅，性能更好
 */

export interface ChartDataPoint {
  date: string;
  [key: string]: any;
}

export interface OptimizationOptions {
  /**
   * 最大点位数量（默认200）
   * 如果数据点超过这个数量，会进行抽样
   */
  maxPoints?: number;
  
  /**
   * 关键点判断函数
   * 返回true的点会被强制保留
   * 例如：有交易的点、开始/结束点等
   */
  isKeyPoint?: (point: ChartDataPoint) => boolean;
  
  /**
   * 是否保留第一个和最后一个点（默认true）
   */
  keepFirstAndLast?: boolean;
}

/**
 * 优化图表数据点
 * 
 * 策略：
 * 1. 保留所有关键点（交易点、首尾点）
 * 2. 对其他点进行等距抽样
 * 3. 使用Douglas-Peucker算法保持曲线形状
 * 
 * @param data 原始数据
 * @param options 优化选项
 * @returns 优化后的数据
 */
export function optimizeChartData<T extends ChartDataPoint>(
  data: T[],
  options: OptimizationOptions = {}
): T[] {
  const {
    maxPoints = 200,
    isKeyPoint = () => false,
    keepFirstAndLast = true,
  } = options;

  // 如果数据量小于最大点数，直接返回
  if (data.length <= maxPoints) {
    return data;
  }

  // 1. 标记关键点
  const keyIndices = new Set<number>();
  
  if (keepFirstAndLast) {
    keyIndices.add(0);
    keyIndices.add(data.length - 1);
  }
  
  data.forEach((point, index) => {
    if (isKeyPoint(point)) {
      keyIndices.add(index);
    }
  });

  // 2. 计算需要抽样的普通点数量
  const keyPointsCount = keyIndices.size;
  const regularPointsNeeded = Math.max(0, maxPoints - keyPointsCount);
  
  // 如果关键点已经超过最大点数，只保留关键点
  if (regularPointsNeeded <= 0) {
    return Array.from(keyIndices)
      .sort((a, b) => a - b)
      .map(i => data[i]);
  }

  // 3. 对非关键点进行等距抽样
  const regularIndices = new Set<number>();
  const totalPoints = data.length;
  const step = (totalPoints - 1) / (regularPointsNeeded + keyPointsCount - 1);
  
  for (let i = 0; i < totalPoints; i++) {
    if (!keyIndices.has(i)) {
      // 检查这个点是否应该被采样
      const expectedIndex = Math.round(regularIndices.size * step);
      if (i >= expectedIndex - step / 2 && i <= expectedIndex + step / 2) {
        regularIndices.add(i);
      }
    }
  }

  // 4. 合并关键点和采样点
  const selectedIndices = new Set([...keyIndices, ...regularIndices]);
  
  // 5. 返回排序后的结果
  return Array.from(selectedIndices)
    .sort((a, b) => a - b)
    .map(i => data[i]);
}

/**
 * 计算两点之间的距离（用于Douglas-Peucker算法）
 * 这里使用简化版本，只考虑时间和值的差异
 */
function perpendicularDistance(
  point: ChartDataPoint,
  lineStart: ChartDataPoint,
  lineEnd: ChartDataPoint,
  valueKey: string
): number {
  const x0 = new Date(point.date).getTime();
  const y0 = point[valueKey] || 0;
  const x1 = new Date(lineStart.date).getTime();
  const y1 = lineStart[valueKey] || 0;
  const x2 = new Date(lineEnd.date).getTime();
  const y2 = lineEnd[valueKey] || 0;

  // 归一化时间和值到相同的尺度
  const timeRange = x2 - x1 || 1;
  const valueRange = Math.abs(y2 - y1) || 1;
  
  const normalizedX = (x0 - x1) / timeRange;
  const normalizedY = (y0 - y1) / valueRange;
  const normalizedX2 = 1;
  const normalizedY2 = (y2 - y1) / valueRange;

  // 计算点到线段的距离
  const numerator = Math.abs(
    normalizedY2 * normalizedX - normalizedX2 * normalizedY
  );
  const denominator = Math.sqrt(
    normalizedX2 * normalizedX2 + normalizedY2 * normalizedY2
  );

  return denominator > 0 ? numerator / denominator : 0;
}

/**
 * Douglas-Peucker 算法简化曲线
 * 保持曲线的主要形状特征
 * 
 * @param data 数据点
 * @param valueKey 用于计算距离的值字段
 * @param epsilon 容差值（越小保留越多点）
 * @returns 简化后的数据索引
 */
export function douglasPeucker(
  data: ChartDataPoint[],
  valueKey: string,
  epsilon: number = 0.01
): number[] {
  if (data.length <= 2) {
    return data.map((_, i) => i);
  }

  const indices: number[] = [];
  
  function recursiveDouglasPeucker(start: number, end: number) {
    let maxDistance = 0;
    let maxIndex = 0;

    for (let i = start + 1; i < end; i++) {
      const distance = perpendicularDistance(
        data[i],
        data[start],
        data[end],
        valueKey
      );
      
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }

    if (maxDistance > epsilon) {
      recursiveDouglasPeucker(start, maxIndex);
      indices.push(maxIndex);
      recursiveDouglasPeucker(maxIndex, end);
    }
  }

  indices.push(0);
  recursiveDouglasPeucker(0, data.length - 1);
  indices.push(data.length - 1);

  return indices.sort((a, b) => a - b);
}

/**
 * 高级优化：结合抽样和Douglas-Peucker算法
 * 
 * @param data 原始数据
 * @param options 优化选项
 * @param valueKey 主要值字段（用于形状保持）
 * @returns 优化后的数据
 */
export function advancedOptimizeChartData<T extends ChartDataPoint>(
  data: T[],
  options: OptimizationOptions = {},
  valueKey: string = 'totalValue'
): T[] {
  const {
    maxPoints = 200,
    isKeyPoint = () => false,
    keepFirstAndLast = true,
  } = options;

  // 如果数据量小于最大点数，直接返回
  if (data.length <= maxPoints) {
    return data;
  }

  // 1. 先标记所有关键点
  const keyIndices = new Set<number>();
  
  if (keepFirstAndLast) {
    keyIndices.add(0);
    keyIndices.add(data.length - 1);
  }
  
  data.forEach((point, index) => {
    if (isKeyPoint(point)) {
      keyIndices.add(index);
    }
  });

  // 2. 对非关键点使用Douglas-Peucker算法
  const allIndices = new Set<number>(keyIndices);
  
  // 动态调整epsilon，确保点数不超过maxPoints
  let epsilon = 0.001;
  let dpIndices: number[] = [];
  
  do {
    dpIndices = douglasPeucker(data, valueKey, epsilon);
    epsilon *= 1.5; // 逐步增加容差
  } while (dpIndices.length + keyIndices.size > maxPoints && epsilon < 1);

  dpIndices.forEach(i => allIndices.add(i));

  // 3. 如果还是太多，进行额外的等距抽样
  if (allIndices.size > maxPoints) {
    const sortedIndices = Array.from(allIndices).sort((a, b) => a - b);
    const step = Math.ceil(sortedIndices.length / maxPoints);
    const finalIndices = new Set(keyIndices);
    
    for (let i = 0; i < sortedIndices.length; i += step) {
      finalIndices.add(sortedIndices[i]);
    }
    
    return Array.from(finalIndices)
      .sort((a, b) => a - b)
      .map(i => data[i]);
  }

  // 4. 返回结果
  return Array.from(allIndices)
    .sort((a, b) => a - b)
    .map(i => data[i]);
}

