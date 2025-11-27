import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function TabNavigation() {
  const pathname = usePathname();

  return (
    <div className="flex justify-center mb-8 border-b border-gray-200">
      <Link
        href="/strategy"
        className={`px-6 py-3 font-medium transition-colors ${
          pathname === '/strategy'
            ? 'border-b-2 border-blue-600 text-blue-600'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        数据展示
      </Link>
      <Link
        href="/strategy/backtest"
        className={`px-6 py-3 font-medium transition-colors ${
          pathname === '/strategy/backtest'
            ? 'border-b-2 border-blue-600 text-blue-600'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        策略回测
      </Link>
    </div>
  );
}

