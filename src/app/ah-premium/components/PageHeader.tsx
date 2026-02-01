/**
 * 页面头部组件
 * 显示标题和说明
 */

export default function PageHeader() {
  return (
    <div className="text-center mb-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        AH溢价策略
      </h1>
      <p className="text-lg text-gray-600 mb-4">
        查看A股与H股的溢价情况，发现投资机会
      </p>
      <p className="text-sm text-gray-500">
        AH股溢价率 = (A股价格 - H股价格×汇率) / (H股价格×汇率) × 100%
      </p>
    </div>
  );
}

