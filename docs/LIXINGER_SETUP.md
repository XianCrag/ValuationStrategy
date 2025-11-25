# Lixinger API 配置说明

## 环境变量配置

1. 在项目根目录创建 `.env.local` 文件（或 `.env` 文件）

2. 添加以下配置：

```env
LIXINGER_TOKEN=your_lixinger_token_here
```

3. 获取 Token：
   - 访问理杏仁开放平台：https://open.lixinger.com
   - 注册账号并申请 API 访问权限
   - 在控制台获取你的 API Token

## 代码格式

### 股票代码格式

Lixinger API 使用的股票代码格式为：`股票代码.交易所代码`

例如：
- 沪深300ETF (上交所): `510300.sh`
- 沪深300ETF (深交所): `159919.SZ`

### 指数代码格式

指数代码直接使用指数代码，无需添加交易所后缀。

例如：
- 沪深300指数: `000300`

## API 使用

API 路由：`/api/lixinger`

### 获取股票数据示例

```json
{
  "stockCodes": ["510300.sh"],
  "years": 10,
  "metricsList": ["mc", "pe_ttm"]
}
```

### 获取指数数据示例

```json
{
  "stockCodes": ["000300"],
  "years": 10,
  "metricsList": ["pe_ttm"]
}
```

**注意**：系统会根据代码格式自动判断是股票还是指数：
- 包含 `.sh` 或 `.sz` 后缀的代码会被识别为股票代码，调用股票 API
- 纯数字代码（如 `000300`）会被识别为指数代码，调用指数 API

## 注意事项

- 确保 `.env.local` 文件已添加到 `.gitignore` 中，不要提交到版本控制
- Token 需要妥善保管，不要泄露
- API 可能有调用频率限制，请合理使用

