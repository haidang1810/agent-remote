import type Database from 'better-sqlite3';
import * as tls from 'node:tls';
import { z } from 'zod';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';

export function registerSslCertInfoTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'ssl_cert_info',
    category: 'ssl',
    description: 'Get SSL certificate details for a domain: subject, issuer, validity, SANs, fingerprint',
    risk_level: 'low',
  });

  addToolDefinition({
    name: 'ssl_cert_info',
    description: 'Get SSL certificate details for a domain: subject, issuer, validity, SANs, fingerprint',
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
            const cert = socket.getPeerCertificate(true);
            socket.end();

            if (!cert || !cert.subject) {
              resolve(errorResult('No certificate returned by server'));
              return;
            }

            const sans: string[] = [];
            const altNames = (cert.subjectaltname ?? '').split(', ');
            for (const an of altNames) {
              if (an.startsWith('DNS:') || an.startsWith('IP:')) {
                sans.push(an);
              }
            }

            const info = {
              subject: {
                CN: cert.subject.CN ?? null,
                O: cert.subject.O ?? null,
              },
              issuer: {
                CN: cert.issuer?.CN ?? null,
                O: cert.issuer?.O ?? null,
              },
              validFrom: cert.valid_from,
              validTo: cert.valid_to,
              serialNumber: cert.serialNumber ?? null,
              SANs: sans,
              fingerprint: cert.fingerprint ?? null,
            };

            resolve(textResult(JSON.stringify(info, null, 2)));
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
