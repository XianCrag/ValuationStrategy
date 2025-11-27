'use client';

import { useState } from 'react';
import { YearlyDetailsTable } from '@/app/components/YearlyDetails';
import { YearlyDetail } from '@/app/backtest/types';

/**
 * 年度详情表格使用示例
 * 展示如何在不同策略中使用 YearlyDetailsTable 组件
 */
export default function YearlyDetailsExamplePage() {
  const [showStockPositions, setShowStockPositions] = useState(false);

  // 示例数据：现金国债策略
  const cashBondYearlyDetails: YearlyDetail[] = [
    {
      year: '2020',
      startValue: 1000000,
      endValue: 1030000,
      return: 3.0,
      startCash: 1000000,
      endCash: 1030000,
      cashInterest: 30000,
    },
    {
      year: '2021',
      startValue: 1030000,
      endValue: 1060900,
      return: 3.0,
      startCash: 1030000,
      endCash: 1060900,
      cashInterest: 30900,
    },
  ];

  // 示例数据：定投策略
  const dcaYearlyDetails: YearlyDetail[] = [
    {
      year: '2020',
      startValue: 1000000,
      endValue: 1050000,
      return: 5.0,
      startStockValue: 0,
      endStockValue: 250000,
      startCash: 1000000,
      endCash: 750000,
      investedAmount: 250000,
      startStockPositions: [],
      endStockPositions: [
        { code: '000300', shares: 80.0, value: 250000, price: 3125 },
      ],
    },
    {
      year: '2021',
      startValue: 1050000,
      endValue: 1150000,
      return: 9.52,
      startStockValue: 250000,
      endStockValue: 650000,
      startCash: 750000,
      endCash: 500000,
      investedAmount: 250000,
      startStockPositions: [
        { code: '000300', shares: 80.0, value: 250000, price: 3125 },
      ],
      endStockPositions: [
        { code: '000300', shares: 200.0, value: 650000, price: 3250 },
      ],
    },
  ];

  // 示例数据：动态调仓策略
  const strategyYearlyDetails: YearlyDetail[] = [
    {
      year: '2020',
      startValue: 1000000,
      endValue: 1120000,
      return: 12.0,
      startStockValue: 600000,
      endStockValue: 672000,
      startBondValue: 400000,
      endBondValue: 448000,
      stockBuyAmount: 50000,
      stockSellAmount: 0,
      bondBuyAmount: 0,
      bondSellAmount: 50000,
      bondInterest: 12000,
      trades: 2,
      startStockPositions: [
        { code: '000300', shares: 200.0, value: 600000, price: 3000 },
      ],
      endStockPositions: [
        { code: '000300', shares: 220.0, value: 672000, price: 3055 },
      ],
    },
    {
      year: '2021',
      startValue: 1120000,
      endValue: 1250000,
      return: 11.61,
      startStockValue: 672000,
      endStockValue: 750000,
      startBondValue: 448000,
      endBondValue: 500000,
      stockBuyAmount: 0,
      stockSellAmount: 30000,
      bondBuyAmount: 30000,
      bondSellAmount: 0,
      bondInterest: 13440,
      trades: 1,
      startStockPositions: [
        { code: '000300', shares: 220.0, value: 672000, price: 3055 },
      ],
      endStockPositions: [
        { code: '000300', shares: 214.0, value: 750000, price: 3505 },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">年度详情表格组件示例</h1>

        {/* 控制开关 */}
        <div className="mb-6 flex items-center">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showStockPositions}
              onChange={(e) => setShowStockPositions(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">显示详细股票持仓</span>
          </label>
        </div>

        {/* 现金国债策略 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            1. 现金国债策略年度详情
          </h2>
          <YearlyDetailsTable
            yearlyDetails={cashBondYearlyDetails}
            strategyType="cash-bond"
          />
        </div>

        {/* 定投策略 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            2. 定投沪深300策略年度详情
          </h2>
          <YearlyDetailsTable
            yearlyDetails={dcaYearlyDetails}
            strategyType="dca"
            showStockPositions={showStockPositions}
          />
        </div>

        {/* 动态调仓策略 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            3. 动态调仓策略年度详情
          </h2>
          <YearlyDetailsTable
            yearlyDetails={strategyYearlyDetails}
            strategyType="strategy"
            showStockPositions={showStockPositions}
          />
        </div>

        {/* 说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">说明</h3>
          <ul className="list-disc list-inside text-blue-800 space-y-1">
            <li>组件会根据策略类型自动显示相关列</li>
            <li>支持多个股票代码的持仓详情</li>
            <li>绿色表示买入/利息，红色表示卖出</li>
            <li>收益率根据正负显示不同颜色</li>
            <li>表格支持横向滚动，年份列固定</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

