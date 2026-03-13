import type Database from 'better-sqlite3';
import { z } from 'zod';
import { resolve4, resolve6, resolveMx, resolveCname, resolveNs, resolveTxt, resolveSoa } from 'node:dns/promises';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';

type RecordType = 'A' | 'AAAA' | 'MX' | 'CNAME' | 'NS' | 'TXT' | 'SOA';

async function dnsResolve(domain: string, recordType: RecordType): Promise<unknown> {
  switch (recordType) {
    case 'A':    return resolve4(domain);
    case 'AAAA': return resolve6(domain);
    case 'MX':   return resolveMx(domain);
    case 'CNAME': return resolveCname(domain);
    case 'NS':   return resolveNs(domain);
    case 'TXT':  return resolveTxt(domain);
    case 'SOA':  return resolveSoa(domain);
  }
}

export function registerNetworkDnsLookupTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'network_dns_lookup',
    category: 'network',
    description: 'Perform DNS lookup for a domain with configurable record type',
    risk_level: 'low',
  });

  addToolDefinition({
    name: 'network_dns_lookup',
    description: 'Perform DNS lookup for a domain with configurable record type',
    schema: {
      domain: z.string().describe('Domain name to look up'),
      recordType: z
        .enum(['A', 'AAAA', 'MX', 'CNAME', 'NS', 'TXT', 'SOA'])
        .optional()
        .default('A')
        .describe('DNS record type to query'),
    },
    async handler(args) {
      const domain = args.domain as string;
      const recordType = ((args.recordType as string) ?? 'A') as RecordType;
      try {
        const records = await dnsResolve(domain, recordType);
        return textResult(
          JSON.stringify({ domain, recordType, records }, null, 2),
        );
      } catch (err) {
        return errorResult(`DNS lookup failed: ${(err as Error).message}`);
      }
    },
  });
}
