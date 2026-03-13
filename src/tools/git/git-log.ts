import type Database from 'better-sqlite3';
import { z } from 'zod';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import { safeExec } from '../_shared/exec-wrapper.js';
import { isPathAllowed } from '../_shared/path-whitelist.js';

export function registerGitLogTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'git_log',
    category: 'git',
    description: 'Get git commit log: hash, author, date, message as JSON array',
    risk_level: 'low',
  });

  addToolDefinition({
    name: 'git_log',
    description: 'Get git commit log: hash, author, date, message as JSON array',
    schema: {
      repoPath: z.string().describe('Absolute path to the git repository'),
      limit: z.number().int().min(1).max(50).optional().describe('Number of commits (default: 10, max: 50)'),
      branch: z.string().optional().describe('Branch name (default: current branch)'),
    },
    async handler(args) {
      const repoPath = args.repoPath as string;
      const limit = Math.min((args.limit as number | undefined) ?? 10, 50);
      const branch = args.branch as string | undefined;

      const check = isPathAllowed(repoPath);
      if (!check.allowed) {
        return errorResult(`Path not allowed: ${check.reason}`);
      }

      try {
        const branchArg = branch ? ` ${JSON.stringify(branch)}` : '';
        const cmd = `git -C ${JSON.stringify(repoPath)} log --format="%H|%an|%ar|%s" -n ${limit}${branchArg}`;
        const raw = await safeExec(cmd);

        if (!raw.trim()) {
          return textResult(JSON.stringify([], null, 2));
        }

        const commits = raw
          .split('\n')
          .filter(Boolean)
          .map((line) => {
            const [hash, author, date, ...msgParts] = line.split('|');
            return {
              hash: hash ?? '',
              author: author ?? '',
              date: date ?? '',
              message: msgParts.join('|'),
            };
          });

        return textResult(JSON.stringify(commits, null, 2));
      } catch (err) {
        return errorResult(`git log failed: ${(err as Error).message}`);
      }
    },
  });
}
