# 估值策略平台 - Valuation Strategy Platform

一个专业的投资策略分析和回测平台，提供指标数据查看、策略回测等功能。

## 功能特性

- **查看指标** (`/indicators`): 查看沪深300等指数的历史数据和指标
- **策略回测** (`/backtest`): 
  - 沪深300平衡策略回测
  - 现金国债对照组
  - 定投沪深300对照组
- **数据可视化**: 使用 Recharts 提供专业的数据图表展示
- **响应式布局**: 左侧菜单 + 右侧内容的现代化界面

## 技术栈

- **前端**: Next.js 15, React 19, TypeScript
- **样式**: Tailwind CSS 4
- **图表**: Recharts
- **后端**: Next.js API Routes (Node.js)
- **数据源**: 理杏仁 (Lixinger) API
- **测试**: Jest
- **开发工具**: ESLint, PostCSS, Autoprefixer

## 快速开始

### 环境要求

- Node.js 18+ 
- npm 或 yarn

### 安装

1. 克隆仓库：
```bash
git clone <repository-url>
cd ValuationStrategy
```

2. 安装依赖：
```bash
npm install
```

3. 配置环境变量：
创建 `.env.local` 文件并添加理杏仁 API token：
```
LIXINGER_TOKEN=your_token_here
```

4. 运行开发服务器：
```bash
npm run dev
```

5. 在浏览器中打开 [http://localhost:3000](http://localhost:3000) (自动重定向到 `/indicators`)

### 可用脚本

- `npm run dev` - 启动开发服务器（使用 Turbopack）
- `npm run build` - 构建生产版本
- `npm run start` - 启动生产服务器
- `npm run lint` - 运行 ESLint
- `npm test` - 运行测试

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   └── lixinger/
│   │       ├── route.ts              # 理杏仁数据 API
│   │       └── __tests__/
│   ├── components/                   # 全局共享组件
│   │   ├── Sidebar.tsx               # 左侧导航菜单
│   │   ├── StrategyLayout.tsx        # 布局组件
│   │   ├── DateRangeDisplay.tsx
│   │   ├── ErrorDisplay.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── MetricSelector.tsx
│   │   ├── RefreshButton.tsx
│   │   ├── IndexDataDisplay.tsx
│   │   ├── NationalDebtDataDisplay.tsx
│   │   └── YearlyDetailsTable.tsx
│   ├── indicators/                   # 查看指标模块
│   │   ├── page.tsx                  # 指标查看页面
│   │   ├── hooks/
│   │   │   └── useStrategyData.ts
│   │   ├── constants.ts
│   │   ├── types.ts
│   │   └── utils.ts
│   ├── backtest/                     # 策略回测模块
│   │   ├── page.tsx                  # 主策略回测页面
│   │   ├── cash-bond/
│   │   │   └── page.tsx              # 现金国债对照组
│   │   ├── dca-csi300/
│   │   │   └── page.tsx              # 定投沪深300对照组
│   │   ├── common/
│   │   │   └── calculations/         # 策略计算逻辑
│   │   │       ├── base.ts           # 基础计算函数
│   │   │       ├── calculateStrategy.ts
│   │   │       ├── calculateControlGroup1.ts
│   │   │       ├── calculateControlGroup2.ts
│   │   │       └── index.ts
│   │   ├── constants.ts
│   │   ├── types.ts
│   │   └── utils.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                      # 根页面（重定向到 /indicators）
├── data/
│   ├── national-debt.json            # 国债数据
│   └── types.ts
└── lib/
    └── lixinger/                     # 理杏仁 API 客户端
```

## 页面路由

### 查看指标 (`/indicators`)
- 展示沪深300、上证50等指数数据
- 查看国债收益率等指标
- 切换指标类型查看不同维度数据

### 策略回测 (`/backtest`)

#### 主策略回测 (`/backtest`)
- 沪深300平衡策略
- 根据PE估值动态调整股债比例
- 每6个月检查一次估值
- 根据股债利差计算目标仓位

#### 现金国债 (`/backtest/cash-bond`)
- 对照组1：纯现金国债策略
- 按月计算利息（基于国债收益率）
- 用于对比策略的基准收益

#### 定投沪深300 (`/backtest/dca-csi300`)
- 对照组2：48个月定期定额投资
- 每月定投固定金额
- 展示定投策略效果
- 对比基金净值走势

## API 端点

### POST /api/lixinger

获取理杏仁数据，支持以下参数：

**请求体：**
```typescript
{
  stockCodes?: string[];              // 股票/基金代码
  nationalDebtCodes?: string[];       // 国债代码
  codeTypeMap?: Record<string, string>; // 代码类型映射
  years?: number;                     // 获取年限
  metricsList?: string[];             // 指标列表
}
```

**响应：**
```typescript
{
  success: boolean;
  data: Array<StockData | BondData>;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  error?: string;
}
```

## 策略说明

### 主策略：沪深300平衡策略
- 基于PE估值动态调整股债比例
- 每6个月检查一次估值
- 根据股债利差计算目标仓位
- 超过阈值时进行再平衡

### 对照组1：现金国债
- 全部资金持有现金
- 按月计算利息（基于国债收益率）
- 用于对比策略的基准收益

### 对照组2：定投沪深300
- 48个月定期定额投资
- 每月定投固定金额
- 展示定投策略效果

## 开发指南

### 添加新策略

1. 在 `src/app/backtest/` 下创建新目录
2. 实现计算逻辑在 `common/calculations/`
3. 在 `Sidebar.tsx` 中添加菜单项
4. 创建页面组件并使用 `StrategyLayout`

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- calculateControlGroup2.test.ts
```

测试文件位于各模块的 `__tests__` 目录中。

## 贡献

1. Fork 本仓库
2. 创建功能分支
3. 提交更改
4. 添加测试（如适用）
5. 提交 Pull Request

## 许可证

本项目使用 ISC 许可证。

## 支持

如有问题或需要支持，请在仓库中提交 issue。

---

Built with ❤️ using Next.js and modern web technologies.
