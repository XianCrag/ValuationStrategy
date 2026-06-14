import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * 取数 Python 脚本运行时（仅本地）。
 *
 * 实时行情 / 估值依赖 a-stock-data Skill 的 Python venv 执行脚本。该 venv 只在
 * 本地开发环境存在，线上部署不含 Python 运行时，因此线上自动进入「只读查看模式」：
 * 跳过脚本执行，返回 offline 标记，由前端回退到选股池快照与离线生成的分析。
 *
 * 判定优先级：环境变量 ENABLE_DATA_SCRIPTS（1/0 强制开关）> venv 是否存在。
 */

const PROJECT_ROOT = process.cwd();
const VENV_PYTHON = path.join(
  PROJECT_ROOT,
  '.cursor',
  'skills',
  'a-stock-data',
  '.venv',
  'bin',
  'python'
);

export interface ScriptResult {
  success: boolean;
  error?: string;
  /** 线上只读模式：脚本未执行 */
  offline?: boolean;
  [key: string]: unknown;
}

/** 当前环境是否允许执行本地取数脚本。 */
export function scriptsAvailable(): boolean {
  const flag = process.env.ENABLE_DATA_SCRIPTS;
  if (flag === '1') return true;
  if (flag === '0') return false;
  return fs.existsSync(VENV_PYTHON);
}

function resolvePython(): string {
  return fs.existsSync(VENV_PYTHON) ? VENV_PYTHON : 'python3';
}

const OFFLINE_RESULT: ScriptResult = {
  success: false,
  offline: true,
  error: '实时行情 / 估值为本地功能，当前为线上只读查看模式',
};

/**
 * 执行 scripts/ 下的取数脚本并解析最后一行 JSON 输出。
 * 线上（脚本不可用）直接返回 offline 结果，不会尝试 spawn。
 */
export function runPythonScript(scriptName: string, code: string): Promise<ScriptResult> {
  if (!scriptsAvailable()) {
    return Promise.resolve({ ...OFFLINE_RESULT });
  }
  const scriptPath = path.join(PROJECT_ROOT, 'scripts', scriptName);
  return new Promise((resolve) => {
    const child = spawn(resolvePython(), [scriptPath, code], { cwd: PROJECT_ROOT });

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
        resolve(JSON.parse(line) as ScriptResult);
      } catch {
        resolve({ success: false, error: `解析数据失败：${line}` });
      }
    });
  });
}
