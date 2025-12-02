'use client';

import { useState, useEffect } from 'react';
import StrategyLayout from '../components/Layout';

interface CacheStats {
  total: number;
  valid: number;
  expired: number;
  entries: Array<{
    key: string;
    timestamp: string;
    expiresAt: string;
    size: number;
  }>;
}

export default function CachePage() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // 获取缓存统计
  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/cache');
      const result = await response.json();
      
      if (result.success) {
        setStats(result.stats);
      } else {
        showMessage('获取缓存统计失败', 'error');
      }
    } catch (error) {
      console.error('Error fetching cache stats:', error);
      showMessage('获取缓存统计失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 清除所有缓存
  const clearAllCache = async () => {
    if (!confirm('确定要清除所有缓存吗？')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/cache', {
        method: 'DELETE',
      });
      const result = await response.json();
      
      if (result.success) {
        showMessage('缓存已清除', 'success');
        fetchStats();
      } else {
        showMessage('清除缓存失败', 'error');
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      showMessage('清除缓存失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 清理过期缓存
  const cleanupCache = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/cache/cleanup', {
        method: 'POST',
      });
      const result = await response.json();
      
      if (result.success) {
        showMessage('过期缓存已清理', 'success');
        setStats(result.stats);
      } else {
        showMessage('清理缓存失败', 'error');
      }
    } catch (error) {
      console.error('Error cleaning up cache:', error);
      showMessage('清理缓存失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // 格式化文件大小
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // 解析并格式化缓存键
  const formatCacheKey = (key: string) => {
    try {
      const parsed = JSON.parse(key);
      
      // 单个 code 缓存格式
      if (parsed.code && parsed.type) {
        const typeMap: Record<string, string> = {
          'stock': '股票',
          'index': '指数',
          'fund': '基金',
          'candlestick': 'K线',
          'debt': '国债',
        };
        
        return (
          <div>
            <div className="font-semibold text-gray-900">
              {typeMap[parsed.type] || parsed.type} - {parsed.code}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {parsed.years} 年数据
            </div>
          </div>
        );
      }
      
      // 其他格式（如国债数据）
      if (parsed.nationalDebtCodes) {
        return (
          <div>
            <div className="font-semibold text-gray-900">国债数据</div>
            <div className="text-xs text-gray-500 mt-1">
              {parsed.nationalDebtCodes.join(', ')} • {parsed.years} 年
            </div>
          </div>
        );
      }
      
      // 默认显示原始键（截断）
      return (
        <div className="font-mono text-xs text-gray-600">
          {key.substring(0, 60)}...
        </div>
      );
    } catch {
      // 解析失败，显示原始键
      return (
        <div className="font-mono text-xs text-gray-600">
          {key.substring(0, 60)}...
        </div>
      );
    }
  };

  return (
    <StrategyLayout>
      <div className="py-8 px-6">
        <div className="max-w-7xl mx-auto">
          {/* 页面标题 */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              缓存管理
            </h1>
            <p className="text-lg text-gray-600">
              查看和管理服务端数据缓存
            </p>
          </div>

          {/* 消息提示 */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {/* 统计卡片 */}
          {stats && (
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-gray-500 text-sm mb-1">总缓存条目</div>
                <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-gray-500 text-sm mb-1">有效缓存</div>
                <div className="text-3xl font-bold text-green-600">{stats.valid}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-gray-500 text-sm mb-1">过期缓存</div>
                <div className="text-3xl font-bold text-orange-600">{stats.expired}</div>
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="mb-6 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">操作</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={fetchStats}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '刷新中...' : '刷新统计'}
              </button>
              <button
                onClick={cleanupCache}
                disabled={loading}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                清理过期缓存
              </button>
              <button
                onClick={clearAllCache}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                清除所有缓存
              </button>
            </div>
          </div>

          {/* 缓存列表 */}
          {stats && stats.entries.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">缓存详情</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        缓存键
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        创建时间
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        过期时间
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        数据大小
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.entries.map((entry, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm">
                          {formatCacheKey(entry.key)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(entry.timestamp).toLocaleString('zh-CN')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(entry.expiresAt).toLocaleString('zh-CN')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatSize(entry.size)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {stats && stats.entries.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="text-gray-400 text-lg mb-2">暂无缓存数据</div>
              <div className="text-gray-500 text-sm">当前没有任何有效的缓存条目</div>
            </div>
          )}

          {/* 说明 */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-2 text-blue-900">缓存说明</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• 缓存自动在每天 23:59:59 过期，次日自动清除</li>
              <li>• 系统每小时自动清理一次过期缓存</li>
              <li>• <strong>单个股票独立缓存</strong>：每只股票/指数单独缓存，提高缓存复用率</li>
              <li>• <strong>并发控制</strong>：最多5个并发请求，兼顾性能与稳定性</li>
              <li>• 相同参数的 API 请求会命中缓存，大幅提升响应速度</li>
              <li>• 可以手动清除缓存以获取最新数据</li>
            </ul>
          </div>
        </div>
      </div>
    </StrategyLayout>
  );
}

