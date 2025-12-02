'use client';

import Link from 'next/link';
import StrategyLayout from '../components/Layout';

export default function BacktestOverviewPage() {
  const strategies = [
    {
      id: 'csi300-pe-balance',
      name: '沪深300PE平衡策略',
      description: '基于沪深300指数PE的股债动态平衡策略，PE范围11-16，每6个月review一次',
      path: '/backtest/csi300-pe-balance',
      color: 'blue',
      icon: '📊',
    },
    {
      id: 'stock-portfolio',
      name: '个股组合策略',
      description: '自选多只个股构建组合，配置股票与现金比例，可选等权重再平衡',
      path: '/backtest/stock-portfolio',
      color: 'orange',
      icon: '🎯',
    },
    {
      id: 'cash-bond',
      name: '对照组1：现金国债',
      description: '全部资金持有现金国债，每月根据国债利率计息',
      path: '/backtest/cash-bond',
      color: 'green',
      icon: '💰',
    },
    {
      id: 'dca-csi300',
      name: '对照组2：定投沪深300',
      description: '通过4年48个月定投沪深300指数基金',
      path: '/backtest/dca-csi300',
      color: 'purple',
      icon: '📈',
    },
  ];

  return (
    <StrategyLayout>
      <div className="py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              策略回测系统
            </h1>
            <p className="text-xl text-gray-600 mb-2">
              对比不同投资策略的历史表现
            </p>
            <p className="text-lg text-gray-500">
              选择一个策略查看详细的回测结果
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {strategies.map((strategy) => (
              <Link
                key={strategy.id}
                href={strategy.path}
                className={`bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-2 border-${strategy.color}-100 hover:border-${strategy.color}-300`}
              >
                <div className="text-center">
                  <div className="text-6xl mb-4">{strategy.icon}</div>
                  <h2 className={`text-2xl font-bold text-${strategy.color}-600 mb-4`}>
                    {strategy.name}
                  </h2>
                  <p className="text-gray-600 leading-relaxed">
                    {strategy.description}
                  </p>
                  <div className={`mt-6 inline-block bg-${strategy.color}-50 text-${strategy.color}-700 px-6 py-2 rounded-full font-semibold`}>
                    查看详情 →
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">关于策略对比</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-gray-700">
              <div>
                <h3 className="font-semibold text-lg mb-2 text-blue-600">📊 主策略</h3>
                <p className="text-sm">
                  沪深300PE平衡策略追求在控制风险的前提下获得超额收益，通过PE估值判断市场位置，动态调整资产配置。
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2 text-green-600">💰 保守对照</h3>
                <p className="text-sm">
                  现金国债策略作为最保守的基准，展示纯固收资产的长期表现，风险极低但收益有限。
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2 text-purple-600">📈 被动对照</h3>
                <p className="text-sm">
                  定投沪深300策略代表被动投资理念，通过定期定额投资分散风险，跟随市场长期成长。
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center text-gray-500 text-sm">
            <p>数据来源：理杏仁 API | 初始资金：100万元 | 回测周期：可选择10-20年</p>
          </div>
        </div>
      </div>
    </StrategyLayout>
  );
}
