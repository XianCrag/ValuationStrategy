'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface MenuItem {
  label: string;
  path: string;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    label: '查看指标',
    path: '/indicators',
  },
  {
    label: '策略回测',
    path: '/backtest',
    children: [
      {
        label: '回测概览',
        path: '/backtest',
      },
      {
        label: '沪深300PE平衡策略',
        path: '/backtest/csi300-pe-balance',
      },
      {
        label: '现金国债',
        path: '/backtest/cash-bond',
      },
      {
        label: '定投沪深300',
        path: '/backtest/dca-csi300',
      },
      {
        label: '股权风险溢价策略',
        path: '/backtest/erp-strategy',
      },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>(['/backtest']);

  const toggleExpand = (path: string) => {
    setExpandedItems((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const isActive = (path: string) => {
    if (path === '/indicators') {
      return pathname === path;
    }
    return pathname.startsWith(path);
  };

  const isChildActive = (item: MenuItem) => {
    if (item.children) {
      return item.children.some((child) => pathname === child.path);
    }
    return false;
  };

  return (
    <aside className="w-64 bg-white shadow-lg h-screen sticky top-0 overflow-y-auto">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">估值策略</h2>
        
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <div key={item.path}>
              {item.children ? (
                <div>
                  <button
                    onClick={() => toggleExpand(item.path)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                      isChildActive(item)
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>{item.label}</span>
                    <svg
                      className={`w-4 h-4 transition-transform ${
                        expandedItems.includes(item.path) ? 'rotate-90' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                  
                  {expandedItems.includes(item.path) && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.path}
                          href={child.path}
                          className={`block px-4 py-2 rounded-lg transition-colors ${
                            pathname === child.path
                              ? 'bg-blue-100 text-blue-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href={item.path}
                  className={`block px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </Link>
              )}
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
