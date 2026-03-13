import type Database from 'better-sqlite3';

// System
import { registerSystemInfoTool } from './system/system-info.js';
import { registerSystemDiskUsageTool } from './system/system-disk-usage.js';
import { registerSystemMemoryDetailTool } from './system/system-memory-detail.js';
import { registerProcessListTool } from './system/process-list.js';
import { registerPortListTool } from './system/port-list.js';

// Filesystem
import { registerFileReadTool } from './filesystem/file-read.js';
import { registerFileWriteTool } from './filesystem/file-write.js';
import { registerFileDeleteTool } from './filesystem/file-delete.js';
import { registerFileStatTool } from './filesystem/file-stat.js';
import { registerFileGrepTool } from './filesystem/file-grep.js';
import { registerFileSearchTool } from './filesystem/file-search.js';
import { registerDirectoryListTool } from './filesystem/directory-list.js';

// Logs
import { registerLogFileTool } from './logs/log-file.js';
import { registerLogJournaldTool } from './logs/log-journald.js';
import { registerLogPm2Tool } from './logs/log-pm2.js';

// Docker
import { registerDockerContainerListTool } from './docker/docker-container-list.js';
import { registerDockerContainerLogsTool } from './docker/docker-container-logs.js';
import { registerDockerContainerInspectTool } from './docker/docker-container-inspect.js';
import { registerDockerContainerRestartTool } from './docker/docker-container-restart.js';
import { registerDockerContainerStartTool } from './docker/docker-container-start.js';
import { registerDockerContainerStopTool } from './docker/docker-container-stop.js';
import { registerDockerContainerStatsTool } from './docker/docker-container-stats.js';
import { registerDockerComposeListTool } from './docker/docker-compose-list.js';
import { registerDockerComposeUpTool } from './docker/docker-compose-up.js';
import { registerDockerComposeDownTool } from './docker/docker-compose-down.js';

// Service / Systemd
import { registerServiceListTool } from './service/service-list.js';
import { registerServiceStatusTool } from './service/service-status.js';
import { registerServiceStartTool } from './service/service-start.js';
import { registerServiceStopTool } from './service/service-stop.js';
import { registerServiceRestartTool } from './service/service-restart.js';

// Network
import { registerNetworkPingTool } from './network/network-ping.js';
import { registerNetworkCheckPortTool } from './network/network-check-port.js';
import { registerNetworkDnsLookupTool } from './network/network-dns-lookup.js';
import { registerNetworkFirewallRulesTool } from './network/network-firewall-rules.js';

// Package
import { registerPackageListTool } from './package/package-list.js';
import { registerPackageCheckUpdatesTool } from './package/package-check-updates.js';

// SSL
import { registerSslCertInfoTool } from './ssl/ssl-cert-info.js';
import { registerSslCertExpiryTool } from './ssl/ssl-cert-expiry.js';

// Git
import { registerGitStatusTool } from './git/git-status.js';
import { registerGitLogTool } from './git/git-log.js';
import { registerGitPullTool } from './git/git-pull.js';

// Cron
import { registerCronListTool } from './cron/cron-list.js';
import { registerCronAddTool } from './cron/cron-add.js';
import { registerCronRemoveTool } from './cron/cron-remove.js';

// PM2
import { registerPm2ListTool } from './pm2/pm2-list.js';
import { registerPm2RestartTool } from './pm2/pm2-restart.js';
import { registerPm2StartTool } from './pm2/pm2-start.js';
import { registerPm2StopTool } from './pm2/pm2-stop.js';

// Nginx
import { registerNginxListSitesTool } from './nginx/nginx-list-sites.js';
import { registerNginxSiteConfigTool } from './nginx/nginx-site-config.js';
import { registerNginxTestConfigTool } from './nginx/nginx-test-config.js';

/** Register all built-in tools — seeds DB + registers with MCP tool registry */
export function registerAllTools(db: Database.Database): void {
  // System
  registerSystemInfoTool(db);
  registerSystemDiskUsageTool(db);
  registerSystemMemoryDetailTool(db);
  registerProcessListTool(db);
  registerPortListTool(db);

  // Filesystem
  registerFileReadTool(db);
  registerFileWriteTool(db);
  registerFileDeleteTool(db);
  registerFileStatTool(db);
  registerFileGrepTool(db);
  registerFileSearchTool(db);
  registerDirectoryListTool(db);

  // Logs
  registerLogFileTool(db);
  registerLogJournaldTool(db);
  registerLogPm2Tool(db);

  // Docker
  registerDockerContainerListTool(db);
  registerDockerContainerLogsTool(db);
  registerDockerContainerInspectTool(db);
  registerDockerContainerRestartTool(db);
  registerDockerContainerStartTool(db);
  registerDockerContainerStopTool(db);
  registerDockerContainerStatsTool(db);
  registerDockerComposeListTool(db);
  registerDockerComposeUpTool(db);
  registerDockerComposeDownTool(db);

  // Service / Systemd
  registerServiceListTool(db);
  registerServiceStatusTool(db);
  registerServiceStartTool(db);
  registerServiceStopTool(db);
  registerServiceRestartTool(db);

  // Network
  registerNetworkPingTool(db);
  registerNetworkCheckPortTool(db);
  registerNetworkDnsLookupTool(db);
  registerNetworkFirewallRulesTool(db);

  // Package
  registerPackageListTool(db);
  registerPackageCheckUpdatesTool(db);

  // SSL
  registerSslCertInfoTool(db);
  registerSslCertExpiryTool(db);

  // Git
  registerGitStatusTool(db);
  registerGitLogTool(db);
  registerGitPullTool(db);

  // Cron
  registerCronListTool(db);
  registerCronAddTool(db);
  registerCronRemoveTool(db);

  // PM2
  registerPm2ListTool(db);
  registerPm2RestartTool(db);
  registerPm2StartTool(db);
  registerPm2StopTool(db);

  // Nginx
  registerNginxListSitesTool(db);
  registerNginxSiteConfigTool(db);
  registerNginxTestConfigTool(db);
}
