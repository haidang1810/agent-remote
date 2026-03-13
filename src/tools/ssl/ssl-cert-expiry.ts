import type Database from 'better-sqlite3';
import * as tls from 'node:tls';
import { z } from 'zod';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';

type ExpiryStatus = 'ok' | 'warning' | 'critical' | 'expired';

function getExpiryStatus(daysRemaining: number): ExpiryStatus {
  if (daysRemaining < 0) return 'expired';
  if (daysRemaining < 7) return 'critical';
  if (daysRemaining <= 30) return 'warning';
  return 'ok';
}

export function registerSslCertExpiryTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'ssl_cert_expiry',
    category: 'ssl',
    description: 'Check SSL certificate expiry for a domain: expiry date, days remaining, status',
    risk_level: 'low',
  });

  addToolDefinition({
    name: 'ssl_cert_expiry',
    description: 'Check SSL certificate expiry for a domain: expiry date, days remaining, status',
    schema: {
      domain: z.string().describe('Domain name to check'),
      port: z.number().int().min(1).max(65535).optional().describe('Port (default: 443)'),
    },
    async handler(args) {
      const host = args.domain as string;
      const port = (args.port as number | undefined) ?? 443;

      return new Promise((resolve) => {
        const socket = tls.connect(
          { host, port, servername: host, rejectUnauthorized: false },
          () => {
            const cert = socket.getPeerCertificate();
            socket.end();

            if (!cert || !cert.valid_to) {
              resolve(errorResult('No certificate returned by server'));
              return;
            }

            const expiryDate = new Date(cert.valid_to);
            const now = new Date();
            const daysRemaining = Math.floor(
              (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            );

            const result = {
              domain: host,
              expiryDate: expiryDate.toISOString(),
              daysRemaining,
              status: getExpiryStatus(daysRemaining),
            };

            resolve(textResult(JSON.stringify(result, null, 2)));
          },
        );

        socket.on('error', (err) => {
          resolve(errorResult(`TLS connection failed: ${err.message}`));
        });

        socket.setTimeout(10_000, () => {
          socket.destroy();
          resolve(errorResult('TLS connection timed out'));
        });
      });
    },
  });
}
