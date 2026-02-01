/**
 * 空状态组件
 * 当没有数据时显示
 */

export default function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="text-gray-400 text-6xl mb-4">📊</div>
      <h3 className="text-xl font-semibold text-gray-700 mb-2">暂无数据</h3>
      <p className="text-gray-500 mb-6">点击&ldquo;获取数据&rdquo;按钮加载AH溢价数据</p>
    </div>
  );
}

