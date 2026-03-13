import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { z } from 'zod';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { isPathAllowed } from '../_shared/path-whitelist.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import type Database from 'better-sqlite3';

const MAX_RECURSIVE_DEPTH = 3;

interface DirEntry {
  name: string;
  type: 'file' | 'dir' | 'symlink';
  size?: string;
  modified?: string;
  children?: DirEntry[];
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
}

function readDir(dir: string, showHidden: boolean, depth: number): DirEntry[] {
  if (depth <= 0) return [];
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }

  if (!showHidden) names = names.filter((n) => !n.startsWith('.'));
  names.sort();

  return names.map((name) => {
    const fullPath = join(dir, name);
    try {
      const stat = statSync(fullPath);
      if (stat.isSymbolicLink()) {
        return { name, type: 'symlink' as const, modified: stat.mtime.toISOString() };
      }
      if (stat.isDirectory()) {
        const entry: DirEntry = { name, type: 'dir', modified: stat.mtime.toISOString() };
        if (depth > 1) entry.children = readDir(fullPath, showHidden, depth - 1);
        return entry;
      }
      return {
        name,
        type: 'file' as const,
        size: humanSize(stat.size),
        modified: stat.mtime.toISOString(),
      };
    } catch {
      return { name, type: 'file' as const };
    }
  });
}

export function registerDirectoryListTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'directory_list',
    category: 'filesystem',
    description: 'List directory contents with optional recursive traversal',
    risk_level: 'low',
  });

  addToolDefinition({
    name: 'directory_list',
    description: 'List directory contents with optional recursive traversal',
    schema: {
      path: z.string().describe('Absolute directory path to list'),
      recursive: z.boolean().optional().describe('Recursively list subdirectories (default: false)'),
      showHidden: z.boolean().optional().describe('Include hidden files/dirs starting with . (default: false)'),
    },
    async handler(args) {
      try {
        const dirPath = resolve(args.path as string);
        const recursive = (args.recursive as boolean) ?? false;
        const showHidden = (args.showHidden as boolean) ?? false;

        const check = isPathAllowed(dirPath);
        if (!check.allowed) return errorResult(check.reason!);

        const depth = recursive ? MAX_RECURSIVE_DEPTH : 1;
        const entries = readDir(dirPath, showHidden, depth);

        return textResult(JSON.stringify(entries, null, 2));
      } catch (err) {
        return errorResult(`Failed to list directory: ${(err as Error).message}`);
      }
    },
  });
}
