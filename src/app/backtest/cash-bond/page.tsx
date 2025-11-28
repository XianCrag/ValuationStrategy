'use client';

import { useState, useCallback } from 'react';
import { BondData, ControlGroupResult } from '../types';
import { INITIAL_CAPITAL, NATIONAL_DEBT_STOCK } from '../constants';
import { fetchLixingerData } from '@/lib/api';
import { calculateControlGroup1 } from './calculations';
import { formatDate, formatDateShort } from '../utils';
import { YearlyDetailsTable } from '../../components/YearlyDetails';
import StrategyLayout from '../../components/Layout';
import ErrorDisplay from '../../components/Error';
import LoadingSpinner from '../../components/LoadingSpinner';
import PageHeader from '../../components/PageHeader';
import CollapsibleSection from '../../components/CollapsibleSection';
import { SimpleTooltip } from '../../components/ChartTooltips';
import StrategyResultCards from '../components/StrategyResultCards';
import { optimizeChartData } from '../chart-utils';
import { ChartContainer } from '../../components/Chart';
import { useBacktestData } from '../hooks/useBacktestData';

export default function CashBondPage() {
  const [selectedYears, setSelectedYears] = useState<number>(10);

  // 使用自定义Hook获取和计算数据
  const { data: bondData, result, loading, error, refetch } = useBacktestData<BondData[], ControlGroupResult>({
    fetchData: useCallback(async () => {
      const bonds = await fetchLixingerData<BondData>({
        nationalDebtCodes: [NATIONAL_DEBT_STOCK.code],
        years: selectedYears,
      });

      return bonds.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    }, [selectedYears]),
    calculateResult: useCallback((sortedBonds: BondData[]) => {
      if (sortedBonds.length === 0) {
        throw new Error('没有可用数据');
      }
      
      const startDate = new Date(sortedBonds[0].date);
      const endDate = new Date(sortedBonds[sortedBonds.length - 1].date);
      return calculateControlGroup1(startDate, endDate, INITIAL_CAPITAL);
    }, []),
    dependencies: [selectedYears],
  });

  return (
    <StrategyLayout>
      <div className="py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            title="对照组1：现金国债"
            description="全部资金持有现金国债，每年根据当年国债利率计算利息"
            selectedYears={selectedYears}
            onYearsChange={setSelectedYears}
          />

          {error && <ErrorDisplay error={error} onRetry={refetch} />}

          {loading && <LoadingSpinner />}

          {!loading && !error && result && bondData && (
            <>
              <StrategyResultCards
                totalReturn={result.totalReturn}
                annualizedReturn={result.annualizedReturn}
                finalValue={result.finalValue}
                maxDrawdown={result.maxDrawdown}
              />
              
              {bondData.length > 0 && (
                <div className="mb-6">
                  <ChartContainer
                    data={optimizeChartData(
                      bondData
                        .filter(item => item.tcm_y10 !== undefined && item.tcm_y10 !== null)
                        .map((item) => ({
                          date: item.date,
                          dateShort: formatDateShort(item.date),
                          fullDate: formatDate(item.date),
                          rate: item.tcm_y10,
                        })),
                      { maxPoints: 300, keepFirstAndLast: true }
                    )}
                    lines={[
                      {
                        dataKey: 'rate',
                        name: '10年期国债收益率 (%)',
                        stroke: '#10b981',
                        strokeWidth: 2,
                      },
                    ]}
                    yAxes={[
                      {
                        yAxisId: 'left',
                        label: '收益率 (%)',
                        tickFormatter: (value) => value.toFixed(2),
                      },
                    ]}
                    title="10年期国债收益率趋势"
                    height={300}
                    xTickFormatter={(value) => {
                      const item = bondData.find(d => d.date === value);
                      return item ? formatDateShort(item.date) : value;
                    }}
                    tooltipContent={(props: any) => (
                      <SimpleTooltip
                        {...props}
                        dateKey="fullDate"
                        valueKey="rate"
                        valueLabel="收益率"
                        formatter={(value) => `${value.toFixed(2)}%`}
                      />
                    )}
                  />
                </div>
              )}
              
              <CollapsibleSection
                buttonText={{ show: '展示详情', hide: '隐藏详情' }}
              >
                <h3 className="text-lg font-semibold mb-2">年度详情</h3>
                <YearlyDetailsTable
                  yearlyDetails={result.yearlyDetails}
                  strategyType="cash-bond"
                />
              </CollapsibleSection>
            </>
          )}
        </div>
      </div>
    </StrategyLayout>
  );
}
