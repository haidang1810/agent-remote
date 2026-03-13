import { exec } from 'node:child_process';

const MAX_OUTPUT = 100 * 1024; // 100KB
const DEFAULT_TIMEOUT = 30_000; // 30s

export interface ExecOptions {
  timeout?: number;
  cwd?: string;
  maxBuffer?: number;
}

/** Safe exec wrapper with timeout + output limit */
export function safeExec(cmd: string, opts?: ExecOptions): Promise<string> {
  const timeout = Math.min(opts?.timeout ?? DEFAULT_TIMEOUT, 120_000);
  const maxBuffer = opts?.maxBuffer ?? MAX_OUTPUT;

  return new Promise((resolve, reject) => {
    exec(cmd, { timeout, maxBuffer, cwd: opts?.cwd }, (err, stdout, stderr) => {
      if (err) {
        if (err.killed) {
          reject(new Error(`Command timed out after ${timeout}ms`));
        } else {
          // Return output even on non-zero exit code
          const output = (stdout || '') + (stderr ? `\n${stderr}` : '');
          resolve(output.trim() || err.message);
        }
      } else {
        resolve((stdout || '').trim());
      }
    });
  });
}

/** Validate a name (service, unit, app) — alphanumeric + dots, dashes, underscores, @ */
export function isValidName(name: string): boolean {
  return /^[\w@.-]+$/.test(name) && name.length <= 128;
}
