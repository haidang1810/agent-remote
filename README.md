# Agent Remote

Self-hosted MCP gateway for VPS with dashboard, API keys, and 51 granular tools.

## Features

- **MCP Server** — Streamable HTTP transport at `/mcp`, compatible with Claude Code, Cursor, etc.
- **API Key Management** — Generate keys with permission groups (read/write/admin), per-key tool overrides
- **51 Granular Tools** — System, filesystem, Docker, services, network, SSL, Git, PM2, Nginx, and more
- **Dashboard** — React SPA with login, tool management, audit logs, live system metrics
- **3-tier Permissions** — Global tool toggle → key group → per-key overrides
- **Filesystem Whitelist** — Configurable allowed directories for filesystem operations
- **Realtime** — WebSocket for live log streaming and system metrics
- **Bilingual** — Vietnamese + English

## Quick Start

```bash
# Install dependencies
npm install
cd web && npm install && cd ..

# Build
npm run build

# Start (development)
npm run dev

# Start (production with PM2)
pm2 start ecosystem.config.cjs
```

Dashboard: `http://localhost:3927`

## Configuration

Copy `.env.example` to `.env`:

```
PORT=3927
HOST=0.0.0.0
JWT_SECRET=your-random-secret
ADMIN_PASSWORD=change-me
DATA_DIR=./data
CORS_ORIGIN=*
ALLOWED_PATHS=/home:/var/www:/var/log:/opt:/etc/nginx:/tmp:/srv
```

## MCP Client Config

```json
{
  "mcpServers": {
    "agent-remote": {
      "url": "http://your-server:3927/mcp",
      "headers": {
        "x-api-key": "ar_k_your_api_key_here"
      }
    }
  }
}
```

## Built-in Tools (51)

### System (5)

| Tool | Risk | Description |
|------|------|-------------|
| `system_info` | low | CPU, RAM, Disk, uptime, load average |
| `system_disk_usage` | low | Detailed disk usage by mount point |
| `system_memory_detail` | low | Memory breakdown — buffers, cache, swap |
| `process_list` | low | List processes sorted by CPU/memory |
| `port_list` | low | Open ports and listening services |

### Filesystem (7)

| Tool | Risk | Description |
|------|------|-------------|
| `file_read` | low | Read file content with line range |
| `file_stat` | low | File metadata — size, permissions, owner |
| `file_search` | low | Find files by name pattern |
| `file_grep` | low | Search file contents (grep) |
| `directory_list` | low | List directory contents |
| `file_write` | high | Write/create file |
| `file_delete` | high | Delete file |

### Logs (3)

| Tool | Risk | Description |
|------|------|-------------|
| `log_journald` | medium | Read journald logs by unit |
| `log_file` | medium | Tail log files with optional filter |
| `log_pm2` | medium | Read PM2 application logs |

### Docker (7)

| Tool | Risk | Description |
|------|------|-------------|
| `docker_container_list` | low | List containers |
| `docker_container_inspect` | low | Inspect container details |
| `docker_container_logs` | medium | Read container logs |
| `docker_container_stats` | low | Container CPU/memory stats |
| `docker_container_start` | high | Start container |
| `docker_container_stop` | high | Stop container |
| `docker_container_restart` | high | Restart container |

### Docker Compose (3)

| Tool | Risk | Description |
|------|------|-------------|
| `docker_compose_list` | low | List compose projects |
| `docker_compose_up` | high | Start compose project |
| `docker_compose_down` | high | Stop compose project |

### Service/Systemd (5)

| Tool | Risk | Description |
|------|------|-------------|
| `service_status` | low | Check service status |
| `service_list` | low | List services (running/failed) |
| `service_start` | critical | Start systemd service |
| `service_stop` | critical | Stop systemd service |
| `service_restart` | critical | Restart systemd service |

### Network (4)

| Tool | Risk | Description |
|------|------|-------------|
| `network_ping` | low | Ping host |
| `network_dns_lookup` | low | DNS resolve (A, MX, CNAME, etc.) |
| `network_check_port` | low | Check if port is open on remote host |
| `network_firewall_rules` | medium | List firewall rules (ufw/iptables) |

### Package (2)

| Tool | Risk | Description |
|------|------|-------------|
| `package_list` | low | List installed packages |
| `package_check_updates` | low | Check available updates |

### SSL/TLS (2)

| Tool | Risk | Description |
|------|------|-------------|
| `ssl_cert_info` | low | SSL certificate details |
| `ssl_cert_expiry` | low | Certificate expiry check |

### Git (3)

| Tool | Risk | Description |
|------|------|-------------|
| `git_status` | low | Repository status |
| `git_log` | low | Recent commits |
| `git_pull` | high | Pull from remote |

### Cron (3)

| Tool | Risk | Description |
|------|------|-------------|
| `cron_list` | low | List crontab entries |
| `cron_add` | critical | Add cron job |
| `cron_remove` | critical | Remove cron job |

### PM2 (4)

| Tool | Risk | Description |
|------|------|-------------|
| `pm2_list` | low | List PM2 processes |
| `pm2_start` | high | Start PM2 app |
| `pm2_stop` | high | Stop PM2 app |
| `pm2_restart` | high | Restart PM2 app |

### Nginx (3)

| Tool | Risk | Description |
|------|------|-------------|
| `nginx_list_sites` | low | List sites enabled/available |
| `nginx_test_config` | low | Test nginx configuration |
| `nginx_site_config` | low | Read site config file |

## Permission Groups

| Group | Access | Risk Levels |
|-------|--------|-------------|
| **read** | Read-only monitoring | low |
| **write** | Read + modify operations | low, medium, high |
| **admin** | Full access | low, medium, high, critical |

## Tech Stack

- **Backend**: Fastify 5 + TypeScript + SQLite (better-sqlite3)
- **Frontend**: React 18 + Vite 5
- **MCP**: @modelcontextprotocol/sdk (Streamable HTTP)
- **Auth**: bcrypt + JWT + SHA-256 API keys
- **Realtime**: @fastify/websocket
- **Deploy**: PM2 fork mode

## Production Deployment

### With Nginx reverse proxy

```nginx
server {
    listen 443 ssl;
    server_name agent.example.com;

    location / {
        proxy_pass http://127.0.0.1:3927;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### With Cloudflare Tunnel

```bash
cloudflared tunnel --url http://localhost:3927
```
