import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';

/**
 * 个股实时行情 API。
 *
 * 数据来源：`a-stock-data` Skill（行情/估值层走腾讯财经）。
 * 通过 Skill 自带的 Python venv 执行 `scripts/stock_quote.py` 取数。
 */

const PROJECT_ROOT = process.cwd();
const SCRIPT_PATH = path.join(PROJECT_ROOT, 'scripts', 'stock_quote.py');
const VENV_PYTHON = path.join(
  PROJECT_ROOT,
  '.cursor',
  'skills',
  'a-stock-data',
  '.venv',
  'bin',
  'python'
);

interface QuoteResult {
  success: boolean;
  error?: string;
  [key: string]: unknown;
}

function resolvePython(): string {
  return fs.existsSync(VENV_PYTHON) ? VENV_PYTHON : 'python3';
}

function runQuote(code: string): Promise<QuoteResult> {
  return new Promise((resolve) => {
    const child = spawn(resolvePython(), [SCRIPT_PATH, code], {
      cwd: PROJECT_ROOT,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => (stdout += chunk.toString()));
    child.stderr.on('data', (chunk) => (stderr += chunk.toString()));

    child.on('error', (err) => {
      resolve({ success: false, error: `无法启动数据脚本：${err.message}` });
    });

    child.on('close', () => {
      const line = stdout.trim().split('\n').filter(Boolean).pop();
      if (!line) {
        resolve({
          success: false,
          error: stderr.trim() || '数据脚本无输出',
        });
        return;
      }
      try {
        resolve(JSON.parse(line) as QuoteResult);
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

  const result = await runQuote(code);
  return NextResponse.json(result, { status: result.success ? 200 : 502 });
}
