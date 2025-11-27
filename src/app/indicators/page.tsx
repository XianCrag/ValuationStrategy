'use client';

import { useState } from 'react';
import { MetricType } from './types';
import { WATCHED_STOCKS, NATIONAL_DEBT_STOCKS } from './constants';
import { useData } from './hooks/useData';
import StrategyLayout from '../components/Layout';
import MetricSelector from '../components/MetricSelector';
import YearSelector from '../components/YearSelector';
import ErrorDisplay from '../components/Error';
import LoadingSpinner from '../components/LoadingSpinner';
import DateRangeDisplay from '../components/DateRange';
import RefreshButton from '../components/RefreshButton';
import IndexDataDisplay from '../components/IndexDisplay';
import NationalDebtDataDisplay from '../components/DebtDataDisplay';

export default function IndicatorsPage() {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('index');
  const [selectedYears, setSelectedYears] = useState<number>(10);
  const { data, loading, error, dateRange, fetchData } = useData(selectedMetric, selectedYears);

  return (
    <StrategyLayout>
      <div className="py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              关注标的数据
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              选择时间范围查看历史数据
            </p>
            
            <YearSelector
              selectedYears={selectedYears}
              onYearsChange={setSelectedYears}
            />
            
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
                
                return selectedMetric === 'index' ? (
                  <IndexDataDisplay
                    key={stock.code}
                    stock={stock}
                    stockData={stockData}
                  />
                ) : (
                  <NationalDebtDataDisplay
                    key={stock.code}
                    stock={stock}
                    stockData={stockData}
                  />
                );
              })}
            </div>
          )}

          {!loading && !error && <RefreshButton loading={loading} onRefresh={fetchData} />}
        </div>
      </div>
    </StrategyLayout>
  );
}
