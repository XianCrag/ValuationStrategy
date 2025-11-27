interface RefreshButtonProps {
  loading: boolean;
  onRefresh: () => void;
}

export default function RefreshButton({ loading, onRefresh }: RefreshButtonProps) {
  return (
    <div className="mt-8 text-center">
      <button
        onClick={onRefresh}
        disabled={loading}
        className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? '加载中...' : '刷新数据'}
      </button>
    </div>
  );
}

