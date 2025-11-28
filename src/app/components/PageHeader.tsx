import YearSelector from './YearSelector';

interface PageHeaderProps {
  /** 页面标题 */
  title: string;
  /** 页面描述 */
  description: string;
  /** 当前选择的年限 */
  selectedYears: number;
  /** 年限改变回调 */
  onYearsChange: (years: number) => void;
  /** 额外的子内容（可选） */
  children?: React.ReactNode;
}

/**
 * 页面头部组件
 * 包含标题、描述和年份选择器
 */
export default function PageHeader({
  title,
  description,
  selectedYears,
  onYearsChange,
  children,
}: PageHeaderProps) {
  return (
    <div className="text-center mb-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        {title}
      </h1>
      <p className="text-lg text-gray-600 mb-4">
        {description}
      </p>
      
      <YearSelector
        selectedYears={selectedYears}
        onYearsChange={onYearsChange}
      />
      
      {children}
    </div>
  );
}

