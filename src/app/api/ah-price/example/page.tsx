/**
 * API测试示例页面
 * 演示如何使用AH Price API
 */

'use client';

import { useState } from 'react';
import { getAHPrice, getBatchAHPrice } from '../client';
import { AHPriceInfo } from '../types';

export default function AHPriceAPIExample() {
    const [singleResult, setSingleResult] = useState<AHPriceInfo | null>(null);
    const [batchResults, setBatchResults] = useState<AHPriceInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 示例1: 获取单个股票
    const handleSingleQuery = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAHPrice('601988'); // 中国银行
            setSingleResult(data);
            console.log('单个查询结果:', data);
        } catch (err) {
            setError(err instanceof Error ? err.message : '查询失败');
        } finally {
            setLoading(false);
        }
    };

    // 示例2: 批量查询
    const handleBatchQuery = async () => {
        setLoading(true);
        setError(null);
        try {
            const stockCodes = ['601988', '601398', '601318', '600036'];
            const { data, stats } = await getBatchAHPrice(stockCodes);
            setBatchResults(data);
            console.log('批量查询结果:', { data, stats });
            alert(`成功获取 ${stats.success}/${stats.total} 个股票数据`);
        } catch (err) {
            setError(err instanceof Error ? err.message : '批量查询失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">AH Price API 示例</h1>

            {/* 按钮区域 */}
            <div className="space-x-4 mb-8">
                <button
                    onClick={handleSingleQuery}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                    {loading ? '查询中...' : '单个查询 (中国银行)'}
                </button>

                <button
                    onClick={handleBatchQuery}
                    disabled={loading}
                    className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                >
                    {loading ? '查询中...' : '批量查询 (4只银行股)'}
                </button>
            </div>

            {/* 错误提示 */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-6">
                    错误: {error}
                </div>
            )}

            {/* 单个查询结果 */}
            {singleResult && (
                <div className="bg-white shadow rounded-lg p-6 mb-6">
                    <h2 className="text-xl font-bold mb-4">单个查询结果</h2>
          <div className="space-y-2">
            <p><strong>股票名称:</strong> {singleResult.aStock.name}</p>
            <p><strong>行业:</strong> {singleResult.industry}</p>
            <p><strong>A股 ({singleResult.aStock.code}):</strong> ¥{singleResult.aStock.price.toFixed(2)}</p>
            <p><strong>H股 ({singleResult.hStock.code}):</strong> HK${singleResult.hStock.price.toFixed(2)} = ¥{singleResult.hStock.priceInCNY.toFixed(2)}</p>
            <p className={`text-lg font-bold ${singleResult.premium.rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <strong>溢价率:</strong> {singleResult.premium.rate >= 0 ? '+' : ''}{singleResult.premium.rate.toFixed(2)}%
            </p>
          </div>
                </div>
            )}

            {/* 批量查询结果 */}
            {batchResults.length > 0 && (
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-4">批量查询结果</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left">股票名称</th>
                                    <th className="px-4 py-2 text-left">行业</th>
                                    <th className="px-4 py-2 text-right">A股价格</th>
                                    <th className="px-4 py-2 text-right">H股价格</th>
                                    <th className="px-4 py-2 text-right">溢价率</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {batchResults.map((item) => (
                                    <tr key={item.aStock.code}>
                                        <td className="px-4 py-2">{item.aStock.name}</td>
                                        <td className="px-4 py-2">{item.industry}</td>
                                        <td className="px-4 py-2 text-right">¥{item.aStock.price.toFixed(2)}</td>
                                        <td className="px-4 py-2 text-right">HK${item.hStock.price.toFixed(2)}</td>
                                        <td className="px-4 py-2 text-right">
                                            <span className={item.premium.rate >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                {item.premium.rate >= 0 ? '+' : ''}{item.premium.rate.toFixed(2)}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 代码示例 */}
            <div className="mt-8 bg-gray-50 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">代码示例</h2>
                <pre className="bg-gray-800 text-gray-100 p-4 rounded overflow-x-auto text-sm">
                    {`// 单个查询
import { getAHPrice } from '@/app/api/ah-price/client';

const data = await getAHPrice('601988');
console.log(data);

// 批量查询
import { getBatchAHPrice } from '@/app/api/ah-price/client';

const { data, stats } = await getBatchAHPrice(['601988', '601398']);
console.log(data, stats);`}
                </pre>
            </div>
        </div>
    );
}

