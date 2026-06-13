import type { Metadata } from 'next';
import StrategyLayout from '../components/Layout';
import StockPoolPageClient from './StockPoolPageClient';

export const metadata: Metadata = {
  title: '股票池 | 估值策略',
  description: '个股估值分析与选股池 —— 输入股票代码，查看实时估值概览与击球区状态',
};

/**
 * 股票池 - 个股估值分析页（顶部部分）
 *
 * 对应 docs/RRD_1.md §1 信息架构的顶部：股票搜索框 + 当前标的 + 概览卡片。
 * 数据源：a-stock-data Skill（见 docs/RRD_1.md §11）。
 */
export default function StockPoolPage() {
  return (
    <StrategyLayout>
      <div className="py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">股票池</h1>
            <p className="text-lg text-gray-600">
              个股深度估值分析 —— 输入股票代码，得到「贵不贵、买不买」的第一直觉
            </p>
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs text-amber-800">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              MVP 版本 · 已接入实时行情/估值，历史分位 / 股息率 / 击球区开发中
            </div>
          </div>

          <StockPoolPageClient />
        </div>
      </div>
    </StrategyLayout>
  );
}
