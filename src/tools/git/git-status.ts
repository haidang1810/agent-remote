import type Database from 'better-sqlite3';
import { z } from 'zod';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import { safeExec } from '../_shared/exec-wrapper.js';
import { isPathAllowed } from '../_shared/path-whitelist.js';

export function registerGitStatusTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'git_status',
    category: 'git',
    description: 'Get git repository status: branch, ahead/behind, changed files, untracked count',
    risk_level: 'low',
  });

  addToolDefinition({
    name: 'git_status',
    description: 'Get git repository status: branch, ahead/behind, changed files, untracked count',
    schema: {
      repoPath: z.string().describe('Absolute path to the git repository'),
    },
    async handler(args) {
      const repoPath = args.repoPath as string;
      const check = isPathAllowed(repoPath);
      if (!check.allowed) {
        return errorResult(`Path not allowed: ${check.reason}`);
      }

      try {
        const raw = await safeExec(
          `git -C ${JSON.stringify(repoPath)} status --porcelain=v2 -b`,
        );

        let branch = 'unknown';
        let ahead = 0;
        let behind = 0;
        let changedCount = 0;
        let untrackedCount = 0;

        for (const line of raw.split('\n')) {
          if (line.startsWith('# branch.head ')) {
            branch = line.slice('# branch.head '.length).trim();
          } else if (line.startsWith('# branch.ab ')) {
            const match = line.match(/\+(\d+)\s+-(\d+)/);
            if (match) {
              ahead = parseInt(match[1], 10);
              behind = parseInt(match[2], 10);
            }
          } else if (line.startsWith('1 ') || line.startsWith('2 ') || line.startsWith('u ')) {
            changedCount++;
          } else if (line.startsWith('? ')) {
            untrackedCount++;
          }
        }

        return textResult(
          JSON.stringify({ branch, ahead, behind, changedCount, untrackedCount }, null, 2),
        );
      } catch (err) {
        return errorResult(`git status failed: ${(err as Error).message}`);
      }
    },
  });
}
