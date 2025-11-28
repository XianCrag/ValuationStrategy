'use client';

import { useState, ReactNode } from 'react';

interface CollapsibleSectionProps {
  /** 标题 */
  title?: string;
  /** 默认是否展开 */
  defaultExpanded?: boolean;
  /** 按钮文本 */
  buttonText?: {
    show: string;
    hide: string;
  };
  /** 子内容 */
  children: ReactNode;
  /** 容器className */
  containerClassName?: string;
  /** 按钮className */
  buttonClassName?: string;
  /** 内容容器className */
  contentClassName?: string;
}

/**
 * 可折叠区域组件
 * 提供展开/收起功能，常用于显示详情信息
 */
export default function CollapsibleSection({
  title,
  defaultExpanded = false,
  buttonText = { show: '展示', hide: '隐藏' },
  children,
  containerClassName = 'bg-white rounded-lg shadow-lg p-6 mb-6',
  buttonClassName = 'bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors',
  contentClassName = 'mt-4',
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={containerClassName}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={buttonClassName}
        aria-expanded={isExpanded}
      >
        {isExpanded ? buttonText.hide : buttonText.show}
        {title && ` ${title}`}
      </button>
      
      {isExpanded && (
        <div className={contentClassName}>
          {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
          {children}
        </div>
      )}
    </div>
  );
}

