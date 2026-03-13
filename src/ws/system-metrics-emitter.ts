import os from 'node:os';
import si from 'systeminformation';
import { broadcastManager } from './broadcast-manager.js';

const INTERVAL_MS = 5000;
let timer: ReturnType<typeof setInterval> | null = null;

async function emitMetrics(): Promise<void> {
  if (!broadcastManager.hasSubscribers('system')) return;

  try {
    const [cpu, mem] = await Promise.all([si.currentLoad(), si.mem()]);
    broadcastManager.broadcast('system', {
      cpuLoad: Math.round(cpu.currentLoad * 100) / 100,
      memoryPercent: Math.round((mem.used / mem.total) * 10000) / 100,
      memoryUsedGB: Math.round(mem.used / 1073741824 * 100) / 100,
      memoryTotalGB: Math.round(mem.total / 1073741824 * 100) / 100,
      uptime: os.uptime(),
      timestamp: Date.now(),
    });
  } catch {
    // Silently skip on error
  }
}

export function startMetricsEmitter(): void {
  if (timer) return;
  timer = setInterval(emitMetrics, INTERVAL_MS);
}

export function stopMetricsEmitter(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
