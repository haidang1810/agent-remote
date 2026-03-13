module.exports = {
  apps: [{
    name: 'agent-remote',
    script: './dist/server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3927,
    },
    max_memory_restart: '200M',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    watch: false,
  }],
};
