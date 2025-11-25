# Lixinger API 接口文档

## 概述

本 API 提供了访问理杏仁开放平台数据的统一接口，支持获取股票和指数的基本面数据。

**基础路径**: `/api/lixinger`

**请求方法**: `POST`

**Content-Type**: `application/json`

---

## 接口说明

### 获取股票/指数数据

获取指定股票或指数的基本面数据，系统会根据代码格式自动判断是股票还是指数。

#### 请求

**URL**: `/api/lixinger`

**Method**: `POST`

**Headers**:
```
Content-Type: application/json
```

**请求体**:

```json
{
  "stockCodes": ["000300"],
  "years": 10,
  "metricsList": ["pe_ttm.y10.mcw.cvpos"]
}
```

**请求参数说明**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `stockCodes` | `string[]` | 是 | - | 股票或指数代码列表。股票代码格式：`代码.交易所`（如 `510300.sh`），指数代码格式：纯数字（如 `000300`） |
| `years` | `number` | 否 | `10` | 获取最近N年的数据 |
| `metricsList` | `string[]` | 否 | `["pe_ttm.y10.mcw.cvpos"]` | 指标列表。股票常用指标：`mc`（市值）、`pe_ttm`（PE TTM）等；指数常用指标：`pe_ttm.y10.mcw.cvpos`（PE TTM 10年分位）等 |

**代码格式说明**:

- **股票代码**: 必须包含交易所后缀
  - 上交所: `.sh` 或 `.SH`（如 `510300.sh`）
  - 深交所: `.sz` 或 `.SZ`（如 `159919.SZ`）

- **指数代码**: 纯数字，无需后缀
  - 沪深300指数: `000300`
  - 中证500指数: `000905`

#### 响应

**成功响应** (`200 OK`):

```json
{
  "success": true,
  "data": [
    {
      "date": "2025-11-25T00:00:00+08:00",
      "stockCode": "000300",
      "pe_ttm.y10.mcw.cvpos": 0.7978592013174146,
      "marketValue": null
    },
    {
      "date": "2025-11-24T00:00:00+08:00",
      "stockCode": "000300",
      "pe_ttm.y10.mcw.cvpos": 0.7859201317414574,
      "marketValue": null
    }
  ],
  "dateRange": {
    "startDate": "2015-11-26",
    "endDate": "2025-11-26"
  }
}
```

**响应字段说明**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `success` | `boolean` | 请求是否成功 |
| `data` | `array` | 数据数组，按日期排序 |
| `data[].date` | `string` | 数据日期（ISO 8601 格式） |
| `data[].stockCode` | `string` | 股票或指数代码 |
| `data[].marketValue` | `number \| null` | 市值（仅股票数据有此字段，指数为 null） |
| `data[].*` | `any` | 其他指标字段，字段名与请求的 `metricsList` 中的指标名对应 |
| `dateRange.startDate` | `string` | 数据开始日期（YYYY-MM-DD） |
| `dateRange.endDate` | `string` | 数据结束日期（YYYY-MM-DD） |

**错误响应** (`400 Bad Request`):

```json
{
  "error": "stockCodes is required",
  "success": false
}
```

**错误响应** (`500 Internal Server Error`):

```json
{
  "error": "LIXINGER_TOKEN 未配置。请在项目根目录的 .env.local 文件中添加：\nLIXINGER_TOKEN=your_actual_token\n\n获取 Token: https://open.lixinger.com\n配置后请重启开发服务器 (npm run dev)",
  "success": false
}
```

---

## 使用示例

### 示例 1: 获取沪深300指数 PE TTM 10年分位数据

**请求**:

```bash
curl -X POST http://localhost:3000/api/lixinger \
  -H "Content-Type: application/json" \
  -d '{
    "stockCodes": ["000300"],
    "years": 10,
    "metricsList": ["pe_ttm.y10.mcw.cvpos"]
  }'
```

**响应**:

```json
{
  "success": true,
  "data": [
    {
      "date": "2025-11-25T00:00:00+08:00",
      "stockCode": "000300",
      "pe_ttm.y10.mcw.cvpos": 0.7978592013174146
    }
  ],
  "dateRange": {
    "startDate": "2015-11-26",
    "endDate": "2025-11-26"
  }
}
```

### 示例 2: 获取股票市值和 PE TTM 数据

**请求**:

```bash
curl -X POST http://localhost:3000/api/lixinger \
  -H "Content-Type: application/json" \
  -d '{
    "stockCodes": ["510300.sh"],
    "years": 5,
    "metricsList": ["mc", "pe_ttm"]
  }'
```

**响应**:

```json
{
  "success": true,
  "data": [
    {
      "date": "2025-11-25T00:00:00+08:00",
      "stockCode": "510300.sh",
      "mc": 1234567890000,
      "pe_ttm": 12.34,
      "marketValue": 1234567890000
    }
  ],
  "dateRange": {
    "startDate": "2020-11-26",
    "endDate": "2025-11-26"
  }
}
```

### 示例 3: 同时获取股票和指数数据

**请求**:

```bash
curl -X POST http://localhost:3000/api/lixinger \
  -H "Content-Type: application/json" \
  -d '{
    "stockCodes": ["510300.sh", "000300"],
    "years": 10,
    "metricsList": ["pe_ttm.y10.mcw.cvpos"]
  }'
```

**说明**: 系统会自动识别 `510300.sh` 为股票代码，`000300` 为指数代码，分别调用对应的 API。

---

## 支持的指标

### 股票指标

| 指标名 | 说明 | 示例值 |
|--------|------|--------|
| `mc` | 市值（Market Cap） | `1234567890000` |
| `pe_ttm` | PE TTM | `12.34` |
| `pb` | 市净率 | `1.23` |
| `ps_ttm` | PS TTM | `2.45` |

### 指数指标

| 指标名 | 说明 | 示例值 |
|--------|------|--------|
| `pe_ttm.y10.mcw.cvpos` | PE TTM 10年分位（市值加权） | `0.7978` (0-1之间，表示在10年历史中的分位) |

**注意**: 
- 指数指标名称格式通常为：`指标名.时间范围.加权方式.分位类型`
- `pe_ttm.y10.mcw.cvpos` 表示：PE TTM，10年历史，市值加权，分位值
- 分位值范围：0-1，0 表示历史最低，1 表示历史最高

---

## 错误处理

### 常见错误

1. **Token 未配置**
   - 错误信息: `LIXINGER_TOKEN 未配置...`
   - 解决方法: 在项目根目录的 `.env.local` 文件中添加 `LIXINGER_TOKEN=your_token`

2. **参数缺失**
   - 错误信息: `stockCodes is required`
   - 解决方法: 确保请求体中包含 `stockCodes` 字段

3. **API 调用失败**
   - 错误信息: `Lixinger API error (code: X): message`
   - 解决方法: 检查 token 是否有效，代码格式是否正确，指标名称是否正确

4. **指标无效**
   - 错误信息: `(指标名) are invalid price metrics`
   - 解决方法: 检查指标名称是否正确，股票和指数的指标可能不同

---

## 注意事项

1. **Token 配置**: 必须在 `.env.local` 文件中配置 `LIXINGER_TOKEN`，参考 [LIXINGER_SETUP.md](./LIXINGER_SETUP.md)

2. **代码格式**: 
   - 股票代码必须包含交易所后缀（`.sh` 或 `.sz`）
   - 指数代码为纯数字，无需后缀
   - 系统会根据代码格式自动判断类型

3. **数据范围**: 
   - 默认获取最近 10 年数据
   - 可通过 `years` 参数调整
   - 实际数据范围取决于理杏仁 API 的数据可用性

4. **指标选择**:
   - 股票和指数支持的指标可能不同
   - 建议查看理杏仁开放平台文档获取完整的指标列表
   - 指数常用指标：`pe_ttm.y10.mcw.cvpos`

5. **性能考虑**:
   - API 可能有调用频率限制
   - 建议合理控制请求频率
   - 大量数据请求可能需要较长时间

---

## 相关文档

- [理杏仁 API 配置说明](./LIXINGER_SETUP.md)
- [策略回测文档](./strategy_backtesting.md)
- [理杏仁开放平台](https://open.lixinger.com)

