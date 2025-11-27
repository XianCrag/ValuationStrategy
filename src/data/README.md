# 数据文件类型定义

本目录包含按年份组织的数据文件的类型定义，适用于按月维度存储的金融数据。

## 类型文件

- `types.ts` - 通用的类型定义

## 使用示例

### 1. 读取国债数据文件

```typescript
import fs from 'fs';
import type { NationalDebtDataFile } from './types';

// 读取JSON文件
const dataFile: NationalDebtDataFile = JSON.parse(
  fs.readFileSync('src/data/national-debt.json', 'utf-8')
);

// 访问数据
const year2020 = dataFile.data['2020'];
const firstItem = year2020[0];
console.log(firstItem.date); // "2020-01"
console.log(firstItem.tcm_y10); // 0.0285

// 访问元数据
console.log(dataFile.metadata.totalRecords); // 5850
console.log(dataFile.metadata.dateRange.start); // "2002-06"
```

### 2. 创建自定义数据文件类型

```typescript
import type { YearlyDataFile, BaseDataItem } from './types';

// 定义自定义数据项
interface CustomDataItem extends BaseDataItem {
  customField: number;
  anotherField: string;
}

// 使用通用类型
type CustomDataFile = YearlyDataFile<CustomDataItem>;

// 创建数据文件
const customFile: CustomDataFile = {
  data: {
    '2020': [
      {
        date: '2020-01',
        customField: 100,
        anotherField: 'value',
      },
    ],
  },
  metadata: {
    fetchedAt: new Date().toISOString(),
    totalRecords: 1,
    filteredRecords: 1,
    dateRange: {
      start: '2020-01',
      end: '2020-01',
    },
    years: ['2020'],
  },
};
```

### 3. 类型导出

所有类型都可以从 `types.ts` 导入：

```typescript
import type {
  YearlyDataFile,
  BaseDataItem,
  DataByYear,
  DateRange,
  DataFileMetadata,
  NationalDebtItem,
  NationalDebtDataFile,
  YearMonth,
  Year,
} from './types';
```

## 数据结构说明

### YearlyDataFile

按年份组织的数据文件结构：

```typescript
{
  data: {
    "2020": [...],  // 该年份的数据数组
    "2021": [...],
    ...
  },
  metadata: {
    fetchedAt: "2025-11-27T10:00:00.000Z",
    totalRecords: 5850,
    filteredRecords: 282,
    dateRange: {
      start: "2002-06",
      end: "2025-11"
    },
    years: ["2002", "2003", ...],
    metricsList: ["tcm_y10"]
  }
}
```

### BaseDataItem

所有数据项必须包含 `date` 字段（年月格式 YYYY-MM），其他字段可以自定义。

### 日期格式

- `YearMonth`: `"YYYY-MM"` 格式，如 `"2020-01"`
- `Year`: `"YYYY"` 格式，如 `"2020"`

