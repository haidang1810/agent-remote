import type Database from 'better-sqlite3';
import { textResult, errorResult } from '../_shared/tool-helpers.js';
import { addToolDefinition } from '../../mcp/tool-registry.js';
import { upsertTool } from '../../db/models/tool-model.js';
import { safeExec } from '../_shared/exec-wrapper.js';

export function registerNetworkFirewallRulesTool(db: Database.Database): void {
  upsertTool(db, {
    name: 'network_firewall_rules',
    category: 'network',
    description: 'Show active firewall rules (ufw or iptables)',
    risk_level: 'medium',
  });

  addToolDefinition({
    name: 'network_firewall_rules',
    description: 'Show active firewall rules (ufw or iptables)',
    schema: {},
    async handler() {
      try {
        // Try ufw first
        const ufwOutput = await safeExec('ufw status verbose');
        // ufw outputs "Status: inactive" or "Status: active" — both are valid
        return textResult(ufwOutput);
      } catch {
        // ufw not installed or failed — fall back to iptables
        try {
          const iptablesOutput = await safeExec('sudo iptables -L -n --line-numbers');
          return textResult(iptablesOutput);
        } catch (err) {
          return errorResult(`Failed to retrieve firewall rules: ${(err as Error).message}`);
        }
      }
    },
  });
}
