import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * 个股估值分析 API（PE 历史分位 / 股息率 / ROE / 击球区）。
 *
 * 数据来源：`a-stock-data` Skill（腾讯现价 + mootdx 日线 + 东财 F10/分红）。
 * 通过 Skill 自带的 Python venv 执行 `scripts/stock_valuation.py` 计算。
 * 该计算涉及多次外部请求，较慢（约 2~8 秒），与轻量的 /api/stock-quote 分离。
 */

const PROJECT_ROOT = process.cwd();
const SCRIPT_PATH = path.join(PROJECT_ROOT, 'scripts', 'stock_valuation.py');
const VENV_PYTHON = path.join(
  PROJECT_ROOT,
  '.cursor',
  'skills',
  'a-stock-data',
  '.venv',
  'bin',
  'python'
);

interface ValuationResult {
  success: boolean;
  error?: string;
  [key: string]: unknown;
}

function resolvePython(): string {
  return fs.existsSync(VENV_PYTHON) ? VENV_PYTHON : 'python3';
}

function runValuation(code: string): Promise<ValuationResult> {
  return new Promise((resolve) => {
    const child = spawn(resolvePython(), [SCRIPT_PATH, code], { cwd: PROJECT_ROOT });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (c) => (stdout += c.toString()));
    child.stderr.on('data', (c) => (stderr += c.toString()));

    child.on('error', (err) => {
      resolve({ success: false, error: `无法启动数据脚本：${err.message}` });
    });

    child.on('close', () => {
      const line = stdout.trim().split('\n').filter(Boolean).pop();
      if (!line) {
        resolve({ success: false, error: stderr.trim() || '数据脚本无输出' });
        return;
      }
      try {
        resolve(JSON.parse(line) as ValuationResult);
      } catch {
        resolve({ success: false, error: `解析数据失败：${line}` });
      }
    });
  });
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')?.trim() ?? '';
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { success: false, error: '请输入 6 位股票代码' },
      { status: 400 }
    );
  }
  const result = await runValuation(code);
  return NextResponse.json(result, { status: result.success ? 200 : 502 });
}
