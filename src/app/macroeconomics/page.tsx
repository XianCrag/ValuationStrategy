import type { Metadata } from 'next';
import StrategyLayout from '../components/Layout';
import MarketSection from './components/MarketSection';
import FearIndexCard from './components/FearIndexCard';
import { GLOBAL_MARKETS, FEAR_INDICES } from './constants';

export const metadata: Metadata = {
  title: '宏观经济看板 | 估值策略',
  description: '收集全球宏观经济相关的数据，包括全球主要市场行情与恐慌指数',
};

/**
 * 宏观经济看板 - MVP 页面
 *
 * 当前为骨架版本，仅展示模块结构（全球市场 + 恐慌指数 VIX），
 * 数据接入与交互细节将在后续迭代中补充。
 */
export default function MacroeconomicsPage() {
  return (
    <StrategyLayout>
      <div className="py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">宏观经济看板</h1>
            <p className="text-lg text-gray-600">
              收集全球宏观经济相关的数据，关注全球主要市场行情与市场情绪指标
            </p>
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs text-amber-800">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              MVP 版本 · 图表使用示例数据，行情接入开发中
            </div>
          </div>

          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">全球市场</h2>
                <p className="text-sm text-gray-500 mt-1">
                  每个地区使用折线图展示主要指数走势
                </p>
              </div>
              <span className="text-sm text-gray-500">
                {GLOBAL_MARKETS.length} 个板块 ·{' '}
                {GLOBAL_MARKETS.reduce((sum, r) => sum + r.indices.length, 0)} 个指数
              </span>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {GLOBAL_MARKETS.map((region) => (
                <MarketSection key={region.id} region={region} />
              ))}
            </div>
          </section>

          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">恐慌指数</h2>
                <p className="text-sm text-gray-500 mt-1">
                  以折线图展示市场情绪与波动率走势
                </p>
              </div>
              <span className="text-sm text-gray-500">VIX</span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {FEAR_INDICES.map((index) => (
                <FearIndexCard key={index.code} index={index} />
              ))}
            </div>
          </section>

          <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-900">
            <div className="font-semibold mb-1">后续迭代计划</div>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>接入各市场指数实时行情与历史数据</li>
              <li>VIX 指数走势图与阈值告警</li>
              <li>添加更多宏观指标：利率、汇率、商品、CPI / PPI 等</li>
              <li>板块联动分析与跨市场对比</li>
            </ul>
          </div>
        </div>
      </div>
    </StrategyLayout>
  );
}
