'use client';

import { useState } from 'react';
import { MetricType } from './types';
import { WATCHED_STOCKS, NATIONAL_DEBT_STOCKS } from './constants';
import { useStrategyData } from './hooks/useStrategyData';
import TabNavigation from './components/TabNavigation';
import MetricSelector from './components/MetricSelector';
import ErrorDisplay from './components/ErrorDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import DateRangeDisplay from './components/DateRangeDisplay';
import RefreshButton from './components/RefreshButton';
import IndexDataDisplay from './components/IndexDataDisplay';
import NationalDebtDataDisplay from './components/NationalDebtDataDisplay';

export default function StrategyPage() {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('index');
  const { data, loading, error, dateRange, fetchData } = useStrategyData(selectedMetric);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <TabNavigation />

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            策略回测 - 关注标的数据
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            展示最近10年的数据
          </p>
          
          <MetricSelector
            selectedMetric={selectedMetric}
            onMetricChange={setSelectedMetric}
          />
        </div>

        {dateRange && <DateRangeDisplay dateRange={dateRange} />}

        {error && <ErrorDisplay error={error} onRetry={fetchData} />}

        {loading && <LoadingSpinner />}

        {!loading && !error && (
          <div className="space-y-8">
            {(selectedMetric === 'index' ? WATCHED_STOCKS : NATIONAL_DEBT_STOCKS).map((stock) => {
              const stockData = data[stock.code] || [];
              
              return (
                <div key={stock.code} className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                    {stock.name} ({stock.code})
                  </h2>
                  
                  {selectedMetric === 'index' ? (
                    <IndexDataDisplay stock={stock} stockData={stockData} />
                  ) : (
                    <NationalDebtDataDisplay stock={stock} stockData={stockData} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <RefreshButton loading={loading} onRefresh={fetchData} />
      </div>
    </div>
  );
}
