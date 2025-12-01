import { dailyCache, generateCacheKey } from '../cache';

describe('Cache System', () => {
  beforeEach(() => {
    // 清除缓存
    dailyCache.clear();
  });

  afterAll(() => {
    // 清理定时器
    dailyCache.stopCleanupTimer();
  });

  describe('generateCacheKey', () => {
    it('should generate consistent cache keys for same parameters', () => {
      const params1 = { stockCodes: ['000001', '000002'], years: 10 };
      const params2 = { years: 10, stockCodes: ['000001', '000002'] };
      
      const key1 = generateCacheKey(params1);
      const key2 = generateCacheKey(params2);
      
      expect(key1).toBe(key2);
    });

    it('should sort arrays in parameters', () => {
      const params1 = { stockCodes: ['000002', '000001'] };
      const params2 = { stockCodes: ['000001', '000002'] };
      
      const key1 = generateCacheKey(params1);
      const key2 = generateCacheKey(params2);
      
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different parameters', () => {
      const params1 = { stockCodes: ['000001'], years: 10 };
      const params2 = { stockCodes: ['000001'], years: 20 };
      
      const key1 = generateCacheKey(params1);
      const key2 = generateCacheKey(params2);
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('DailyCache', () => {
    it('should store and retrieve data', () => {
      const key = 'test-key';
      const data = { value: 'test-data' };
      
      dailyCache.set(key, data);
      const retrieved = dailyCache.get(key);
      
      expect(retrieved).toEqual(data);
    });

    it('should return null for non-existent key', () => {
      const retrieved = dailyCache.get('non-existent-key');
      expect(retrieved).toBeNull();
    });

    it('should check if cache exists', () => {
      const key = 'test-key';
      
      expect(dailyCache.has(key)).toBe(false);
      
      dailyCache.set(key, { value: 'test' });
      
      expect(dailyCache.has(key)).toBe(true);
    });

    it('should delete cache entry', () => {
      const key = 'test-key';
      
      dailyCache.set(key, { value: 'test' });
      expect(dailyCache.has(key)).toBe(true);
      
      const deleted = dailyCache.delete(key);
      expect(deleted).toBe(true);
      expect(dailyCache.has(key)).toBe(false);
    });

    it('should clear all cache', () => {
      dailyCache.set('key1', { value: 'test1' });
      dailyCache.set('key2', { value: 'test2' });
      
      const statsBefore = dailyCache.getStats();
      expect(statsBefore.total).toBe(2);
      
      dailyCache.clear();
      
      const statsAfter = dailyCache.getStats();
      expect(statsAfter.total).toBe(0);
    });

    it('should provide stats', () => {
      dailyCache.set('key1', { value: 'test1' });
      dailyCache.set('key2', { value: 'test2' });
      
      const stats = dailyCache.getStats();
      
      expect(stats.total).toBe(2);
      expect(stats.valid).toBe(2);
      expect(stats.expired).toBe(0);
      expect(stats.entries).toHaveLength(2);
    });

    it('should set expiration to end of day', () => {
      const key = 'test-key';
      const data = { value: 'test-data' };
      
      dailyCache.set(key, data);
      const stats = dailyCache.getStats();
      
      // 检查过期时间是否在今天 23:59:59
      const now = new Date();
      const expiryDate = new Date(stats.entries[0].expiresAt);
      
      expect(expiryDate.getFullYear()).toBe(now.getFullYear());
      expect(expiryDate.getMonth()).toBe(now.getMonth());
      expect(expiryDate.getDate()).toBe(now.getDate());
      expect(expiryDate.getHours()).toBe(23);
      expect(expiryDate.getMinutes()).toBe(59);
      expect(expiryDate.getSeconds()).toBe(59);
    });
  });
});

