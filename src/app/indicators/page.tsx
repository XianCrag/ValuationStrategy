'use client';

import { useState } from 'react';
import { MetricType } from './types';
import { 
  CSI300_INDEX_STOCK, 
  CSI300_FUND_STOCK, 
  A_STOCK_ALL_STOCK, 
  NATIONAL_DEBT_STOCK,
} from './constants';
import { useData } from './hooks/useData';
import StrategyLayout from '../components/Layout';
import MetricSelector from '../components/MetricSelector';
import YearSelector from '../components/YearSelector';
import ErrorDisplay from '../components/Error';
import LoadingSpinner from '../components/LoadingSpinner';
import DateRangeDisplay from '../components/DateRange';
import RefreshButton from '../components/RefreshButton';
import IndexDataDisplay from './components/IndexDisplay';
import NationalDebtDataDisplay from './components/DebtDataDisplay';
import ERPDisplay from './components/ERPDisplay';

export default function IndicatorsPage() {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('csi300-index');
  const [selectedYears, setSelectedYears] = useState<number>(10);
  const { data, loading, error, fetchData } = useData(selectedMetric, selectedYears);

  // 根据选择的指标类型获取要显示的数据
  const getDisplayContent = () => {
    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorDisplay error={error} onRetry={fetchData} />;

    if (selectedMetric === 'csi300-index') {
      return (
        <div className="space-y-8">
          <IndexDataDisplay
            stock={CSI300_INDEX_STOCK}
            stockData={data[CSI300_INDEX_STOCK.code] || []}
          />
        </div>
      );
    } else if (selectedMetric === 'csi300-fund') {
      return (
        <div className="space-y-8">
          <IndexDataDisplay
            stock={CSI300_FUND_STOCK}
            stockData={data[CSI300_FUND_STOCK.code] || []}
          />
        </div>
      );
    } else if (selectedMetric === 'a-stock-all') {
      return (
        <div className="space-y-8">
          <IndexDataDisplay
            stock={A_STOCK_ALL_STOCK}
            stockData={data[A_STOCK_ALL_STOCK.code] || []}
          />
        </div>
      );
    } else if (selectedMetric === 'interest') {
      return (
        <div className="space-y-8">
          <NationalDebtDataDisplay
            stock={NATIONAL_DEBT_STOCK}
            stockData={data[NATIONAL_DEBT_STOCK.code] || []}
          />
        </div>
      );
    } else if (selectedMetric === 'erp') {
      const aStockData = data[A_STOCK_ALL_STOCK.code] || [];
      const bondData = data[NATIONAL_DEBT_STOCK.code] || [];
      return <ERPDisplay aStockData={aStockData} bondData={bondData} />;
    }

    return null;
  };

  return (
    <StrategyLayout>
      <div className="py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              关注标的数据
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              选择指标类型和时间范围查看历史数据
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

          {getDisplayContent()}

          {!loading && !error && <RefreshButton loading={loading} onRefresh={fetchData} />}
        </div>
      </div>
    </StrategyLayout>
  );
}
