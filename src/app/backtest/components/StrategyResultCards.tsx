import { formatNumber } from '../utils';

interface MetricCardProps {
  title: string;
  value: string;
  colorClass: 'blue' | 'green' | 'purple' | 'red' | 'orange';
  subtitle?: string;
}

function MetricCard({ title, value, colorClass, subtitle }: MetricCardProps) {
  const bgColors = {
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    purple: 'bg-purple-50',
    red: 'bg-red-50',
    orange: 'bg-orange-50',
  };
  
  const textColors = {
    blue: 'text-blue-900',
    green: 'text-green-900',
    purple: 'text-purple-900',
    red: 'text-red-900',
    orange: 'text-orange-900',
  };
  
  const valueColors = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    red: 'text-red-600',
    orange: 'text-orange-600',
  };
  
  const subtitleColors = {
    blue: 'text-blue-700',
    green: 'text-green-700',
    purple: 'text-purple-700',
    red: 'text-red-700',
    orange: 'text-orange-700',
  };

  return (
    <div className={`${bgColors[colorClass]} p-4 rounded-lg`}>
      <h3 className={`text-sm font-medium ${textColors[colorClass]} mb-2`}>
        {title}
      </h3>
      <p className={`text-2xl font-bold ${valueColors[colorClass]}`}>
        {value}
      </p>
      {subtitle && (
        <p className={`text-sm ${subtitleColors[colorClass]} mt-1`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

interface StrategyResultCardsProps {
  /** 总收益率（百分比） */
  totalReturn: number;
  /** 年化收益率（百分比） */
  annualizedReturn: number;
  /** 最终价值（元） */
  finalValue: number;
  /** 最大回撤（百分比） */
  maxDrawdown: number;
  /** 最终股票仓位（可选，仅股债平衡策略） */
  finalStockRatio?: number;
  /** 自定义第三个卡片的配置（可选） */
  customThirdCard?: {
    title: string;
    value: string;
    subtitle?: string;
  };
}

/**
 * 策略结果卡片组件
 * 展示回测策略的关键指标
 */
export default function StrategyResultCards({
  totalReturn,
  annualizedReturn,
  finalValue,
  maxDrawdown,
  finalStockRatio,
  customThirdCard,
}: StrategyResultCardsProps) {
  // 第三个卡片：根据策略类型显示不同内容
  const renderThirdCard = () => {
    // 如果有自定义卡片配置，使用自定义配置
    if (customThirdCard) {
      return (
        <MetricCard
          title={customThirdCard.title}
          value={customThirdCard.value}
          subtitle={customThirdCard.subtitle}
          colorClass="purple"
        />
      );
    }
    
    // 如果有最终股票仓位，显示仓位信息（股债平衡策略）
    if (finalStockRatio !== undefined) {
      return (
        <MetricCard
          title="最终仓位"
          value={`股票: ${(finalStockRatio * 100).toFixed(1)}%`}
          subtitle={`债券: ${((1 - finalStockRatio) * 100).toFixed(1)}%`}
          colorClass="purple"
        />
      );
    }
    
    // 默认显示最终价值
    return (
      <MetricCard
        title="最终价值"
        value={formatNumber(finalValue)}
        colorClass="purple"
      />
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">策略结果</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="总收益率"
          value={`${totalReturn.toFixed(2)}%`}
          colorClass="blue"
        />
        <MetricCard
          title="年化收益率"
          value={`${annualizedReturn.toFixed(2)}%`}
          colorClass="green"
        />
        {renderThirdCard()}
        <MetricCard
          title="最大回撤"
          value={`${maxDrawdown.toFixed(2)}%`}
          colorClass="red"
        />
      </div>
    </div>
  );
}

