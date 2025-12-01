/**
 * 服务端数据缓存工具
 * 缓存数据在当天有效，次日自动过期
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class DailyCache {
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // 仅在服务端初始化定时清理
    if (typeof window === 'undefined') {
      this.startCleanupTimer();
    }
  }

  /**
   * 获取缓存数据
   * @param key 缓存键
   * @returns 缓存的数据，如果不存在或已过期则返回 null
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // 检查是否过期
    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * 设置缓存数据（当天有效）
   * @param key 缓存键
   * @param data 要缓存的数据
   */
  set<T>(key: string, data: T): void {
    const now = new Date();
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    );

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: endOfDay.getTime(),
    });
  }

  /**
   * 删除指定缓存
   * @param key 缓存键
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 清除过期缓存
   */
  cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 清理了 ${cleanedCount} 个过期缓存`);
    }
  }

  /**
   * 启动定时清理任务
   */
  private startCleanupTimer(): void {
    // 每小时清理一次过期缓存
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000);

    // 确保在进程退出时清理定时器
    if (typeof process !== 'undefined') {
      const cleanupHandler = () => {
        if (this.cleanupInterval) {
          clearInterval(this.cleanupInterval);
        }
      };
      
      process.on('exit', cleanupHandler);
      process.on('SIGINT', cleanupHandler);
      process.on('SIGTERM', cleanupHandler);
    }
  }

  /**
   * 停止定时清理任务（用于测试）
   */
  stopCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    const entries = Array.from(this.cache.entries());
    const now = Date.now();
    
    const validEntries = entries.filter(([_, entry]) => now <= entry.expiresAt);
    const expiredEntries = entries.filter(([_, entry]) => now > entry.expiresAt);

    return {
      total: this.cache.size,
      valid: validEntries.length,
      expired: expiredEntries.length,
      entries: validEntries.map(([key, entry]) => ({
        key: key.substring(0, 100), // 只显示前100个字符
        timestamp: new Date(entry.timestamp).toISOString(),
        expiresAt: new Date(entry.expiresAt).toISOString(),
        size: JSON.stringify(entry.data).length,
      })),
    };
  }

  /**
   * 检查缓存是否存在且有效
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }
    
    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
}

// 导出单例实例
export const dailyCache = new DailyCache();

/**
 * 生成缓存键的辅助函数
 * @param params 参数对象
 * @returns 标准化的缓存键
 */
export function generateCacheKey(params: Record<string, any>): string {
  // 对对象的键进行排序，确保相同参数生成相同的键
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      const value = params[key];
      // 对数组进行排序
      if (Array.isArray(value)) {
        acc[key] = [...value].sort();
      } else if (typeof value === 'object' && value !== null) {
        // 对对象递归处理
        acc[key] = generateCacheKey(value);
      } else {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);

  return JSON.stringify(sortedParams);
}

