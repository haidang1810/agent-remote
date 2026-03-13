import type { FastifyInstance } from 'fastify';
import os from 'node:os';
import si from 'systeminformation';

export async function registerSystemRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', app.authenticate);

  // GET /api/system/stats
  app.get('/api/system/stats', async () => {
    const [cpu, mem, disk] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
    ]);
    return {
      data: {
        hostname: os.hostname(),
        uptime: os.uptime(),
        cpu: { load: Math.round(cpu.currentLoad * 100) / 100, cores: os.cpus().length },
        memory: {
          totalGB: Math.round(mem.total / 1073741824 * 100) / 100,
          usedGB: Math.round(mem.used / 1073741824 * 100) / 100,
          percent: Math.round((mem.used / mem.total) * 10000) / 100,
        },
        disks: disk.map((d) => ({
          mount: d.mount,
          totalGB: Math.round(d.size / 1073741824 * 100) / 100,
          usedPercent: Math.round(d.use * 100) / 100,
        })),
      },
    };
  });

  // GET /api/system/processes
  app.get<{ Querystring: { limit?: string } }>('/api/system/processes', async (request) => {
    const limit = Math.min(50, parseInt(request.query.limit ?? '20', 10));
    const data = await si.processes();
    const top = data.list.sort((a, b) => b.cpu - a.cpu).slice(0, limit);
    return {
      data: top.map((p) => ({ pid: p.pid, name: p.name, cpu: p.cpu, mem: p.mem })),
    };
  });

  // GET /api/system/ports
  app.get('/api/system/ports', async () => {
    const conns = await si.networkConnections();
    return {
      data: conns.filter((c) => c.state === 'LISTEN').map((c) => ({
        protocol: c.protocol,
        port: c.localPort,
        address: c.localAddress,
        pid: c.pid,
      })),
    };
  });

  // GET /api/system/docker
  app.get('/api/system/docker', async () => {
    try {
      const Dockerode = (await import('dockerode')).default;
      const docker = new Dockerode();
      const containers = await docker.listContainers({ all: true });
      return {
        data: containers.map((c) => ({
          name: c.Names?.[0]?.replace(/^\//, ''),
          image: c.Image,
          status: c.Status,
          state: c.State,
        })),
      };
    } catch {
      return { data: [], error: 'Docker not available' };
    }
  });
}
