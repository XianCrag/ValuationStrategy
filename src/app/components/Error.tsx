interface ErrorDisplayProps {
  error: string;
  onRetry: () => void;
  type?: 'config' | 'fetch';
  title?: string;
}

export default function ErrorDisplay({ 
  error, 
  onRetry, 
  type = 'fetch',
  title
}: ErrorDisplayProps) {
  const displayTitle = title || (type === 'config' ? '配置错误' : '错误');
  
  return (
    <div className="bg-red-50 border border-red-200 rounded-md p-6 mb-6">
      <h3 className="text-lg font-semibold text-red-800 mb-2">{displayTitle}</h3>
      <p className="text-red-700 whitespace-pre-line mb-4">{error}</p>
      
      {type === 'config' && (
        <div className="bg-white border border-red-200 rounded p-4 mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">配置步骤：</p>
          <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
            <li>在项目根目录找到 <code className="bg-gray-100 px-1 rounded">.env.local</code> 文件</li>
            <li>添加或修改：<code className="bg-gray-100 px-1 rounded">LIXINGER_TOKEN=your_actual_token</code></li>
            <li>从 <a href="https://open.lixinger.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">理杏仁开放平台</a> 获取你的 Token</li>
            <li>重启开发服务器：<code className="bg-gray-100 px-1 rounded">npm run dev</code></li>
          </ol>
        </div>
      )}
      
      <button
        onClick={onRetry}
        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
      >
        重试
      </button>
    </div>
  );
}

