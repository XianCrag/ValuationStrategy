'use client';

import { useState } from 'react';
import StrategyLayout from '../components/Layout';
import ErrorDisplay from '../components/Error';
import { AH_STOCKS, AH_INDUSTRIES } from '@/constants/ah-stocks';
import { AHPremiumData } from './types';
import PageHeader from './components/PageHeader';
import ControlPanel from './components/ControlPanel';
import StatisticsPanel from './components/StatisticsPanel';
import AllDataTable from './components/AllDataTable';
import EmptyState from './components/EmptyState';
import ProgressBar from './components/ProgressBar';
import { getAHPrice } from '../api/ah-price/client';

export default function AHPremiumPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedIndustry, setSelectedIndustry] = useState<string>('全部');
    const [premiumData, setPremiumData] = useState<AHPremiumData[]>([]);
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    // 获取真实的AH价格数据 - 逐个获取
    const fetchAHPremiumData = async () => {
        setLoading(true);
        setError(null);
        setPremiumData([]); // 清空旧数据

        try {
            console.log('🚀 开始获取AH股票价格数据...');

            // 根据选择的行业筛选股票列表
            const stocksToFetch = selectedIndustry === '全部'
                ? AH_STOCKS
                : AH_STOCKS.filter(stock => stock.industry === selectedIndustry);

            const allACodes = stocksToFetch.map(stock => stock.aCode);
            const totalStocks = allACodes.length;
            console.log(`📊 ${selectedIndustry === '全部' ? '全部行业' : `【${selectedIndustry}】行业`}，共需获取 ${totalStocks} 只股票数据`);

            // 初始化进度
            setProgress({ current: 0, total: totalStocks });

            const allResults: AHPremiumData[] = [];
            let successCount = 0;
            let failCount = 0;

            // 逐个获取股票数据
            for (let i = 0; i < totalStocks; i++) {
                const aCode = allACodes[i];

                try {
                    console.log(`📈 [${i + 1}/${totalStocks}] 获取 ${aCode}...`);

                    const data = await getAHPrice(aCode);

                    if (data) {
                        // 转换为页面需要的格式
                        const stockData: AHPremiumData = {
                            aCode: data.aStock.code,
                            hCode: data.hStock.code,
                            name: data.aStock.name,
                            industry: data.industry,
                            aPrice: data.aStock.price,
                            hPrice: data.hStock.price,
                            hPriceInCNY: data.hStock.priceInCNY,
                            premium: data.premium.rate,
                        };

                        allResults.push(stockData);
                        successCount++;

                        // 实时更新数据和进度
                        setPremiumData([...allResults]);
                        setProgress({ current: i + 1, total: totalStocks });

                        console.log(`  ✅ ${data.aStock.name} 获取成功`);
                    }
                } catch (stockError) {
                    failCount++;
                    console.error(`  ❌ ${aCode} 获取失败:`, stockError);
                }

                // 每个请求之间稍作延迟，避免请求过快
                if (i < totalStocks - 1) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }

            console.log(`✅ 数据获取完成: 成功 ${successCount}/${totalStocks}, 失败 ${failCount}`);

            if (allResults.length === 0) {
                throw new Error('未能获取任何股票数据');
            }

        } catch (err) {
            console.error('❌ 获取数据失败:', err);
            setError(err instanceof Error ? err.message : '数据加载失败');
        } finally {
            setLoading(false);
            setProgress({ current: 0, total: 0 }); // 重置进度
        }
    };

    // 数据已经在获取时按行业筛选，这里直接使用
    // 但为了保持统一的数据结构，仍然定义 filteredData
    const filteredData = premiumData;

    return (
        <StrategyLayout>
            <div className="py-8 px-6">
                <div className="max-w-7xl mx-auto">
                    {/* 页面标题 */}
                    <PageHeader />

                    {/* 控制面板 */}
                    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                        <ControlPanel
                            selectedIndustry={selectedIndustry}
                            industries={AH_INDUSTRIES}
                            loading={loading}
                            onIndustryChange={setSelectedIndustry}
                            onRefresh={fetchAHPremiumData}
                        />

                        {/* 统计信息 */}
                        {premiumData.length > 0 && !loading && <StatisticsPanel data={filteredData} />}
                    </div>

                    {/* 进度条 */}
                    {loading && progress.total > 0 && (
                        <ProgressBar
                            current={progress.current}
                            total={progress.total}
                            message={`正在获取第 ${progress.current} 只股票，共 ${progress.total} 只...`}
                        />
                    )}

                    {/* 错误状态 */}
                    {error && <ErrorDisplay error={error} onRetry={fetchAHPremiumData} />}

                    {/* 数据展示区域 - 使用新的完整数据表格 */}
                    {!error && premiumData.length > 0 && (
                        <AllDataTable data={filteredData} />
                    )}

                    {/* 空状态提示 */}
                    {!loading && !error && premiumData.length === 0 && <EmptyState />}
                </div>
            </div>
        </StrategyLayout>
    );
}
