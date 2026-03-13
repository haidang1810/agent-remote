import type Database from 'better-sqlite3';
import { z } from 'zod';
import { existsSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import { isValidName } from '../_shared/exec-wrapper.js';

const SITES_ENABLED = '/etc/nginx/sites-enabled';
const SITES_AVAILABLE = '/etc/nginx/sites-available';
const MAX_CONFIG_SIZE = 512 * 1024; // 512KB

export function registerNginxSiteConfigTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'nginx_site_config',
    category: 'nginx',
    description: 'Read nginx site configuration file from sites-enabled or sites-available',
    risk_level: 'low',
  });

  addToolDefinition({
    name: 'nginx_site_config',
    description: 'Read nginx site configuration file from sites-enabled or sites-available',
    schema: {
      siteName: z.string().describe('Nginx site name (filename in sites-enabled or sites-available)'),
    },
    async handler(args) {
      const siteName = args.siteName as string;

      // Validate name to prevent path traversal
      if (!isValidName(siteName)) {
        return errorResult(
          `Invalid site name: "${siteName}". Only alphanumeric, dots, dashes, underscores, @ allowed.`,
        );
      }

      // Extra guard: reject any path separators even if isValidName passes
      if (siteName.includes('/') || siteName.includes('\\')) {
        return errorResult('Site name must not contain path separators');
      }

      const enabledPath = join(SITES_ENABLED, siteName);
      const availablePath = join(SITES_AVAILABLE, siteName);

      // Determine which path to read
      let filePath: string;
      let source: string;

      if (existsSync(enabledPath)) {
        filePath = enabledPath;
        source = 'sites-enabled';
      } else if (existsSync(availablePath)) {
        filePath = availablePath;
        source = 'sites-available';
      } else {
        return errorResult(
          `Site "${siteName}" not found in ${SITES_ENABLED} or ${SITES_AVAILABLE}`,
        );
      }

      try {
        const stat = statSync(filePath);
        if (stat.size > MAX_CONFIG_SIZE) {
          return errorResult(`Config file too large: ${stat.size} bytes (max ${MAX_CONFIG_SIZE})`);
        }

        const content = readFileSync(filePath, 'utf-8');
        return textResult(`# ${source}/${siteName}\n\n${content}`);
      } catch (err) {
        const errno = (err as NodeJS.ErrnoException).code;
        if (errno === 'EACCES') {
          return errorResult(`Permission denied reading: ${filePath}`);
        }
        return errorResult(`Failed to read site config: ${(err as Error).message}`);
      }
    },
  });
}
