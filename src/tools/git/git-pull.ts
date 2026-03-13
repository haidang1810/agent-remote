import type Database from 'better-sqlite3';
import { z } from 'zod';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import { safeExec } from '../_shared/exec-wrapper.js';
import { isPathAllowed } from '../_shared/path-whitelist.js';

export function registerGitPullTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'git_pull',
    category: 'git',
    description: 'Pull latest changes from remote for a git repository',
    risk_level: 'high',
  });

  addToolDefinition({
    name: 'git_pull',
    description: 'Pull latest changes from remote for a git repository',
    schema: {
      repoPath: z.string().describe('Absolute path to the git repository'),
      branch: z.string().optional().describe('Branch to pull (default: current HEAD)'),
    },
    async handler(args) {
      const repoPath = args.repoPath as string;
      const branch = args.branch as string | undefined;

      const check = isPathAllowed(repoPath);
      if (!check.allowed) {
        return errorResult(`Path not allowed: ${check.reason}`);
      }

      try {
        const branchArg = branch ? ` ${JSON.stringify(branch)}` : ' HEAD';
        const cmd = `git -C ${JSON.stringify(repoPath)} pull origin${branchArg}`;
        const output = await safeExec(cmd, { timeout: 30_000 });
        return textResult(output || 'Pull completed');
      } catch (err) {
        return errorResult(`git pull failed: ${(err as Error).message}`);
      }
    },
  });
}
