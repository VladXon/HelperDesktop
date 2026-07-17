const path = require('node:path');
module.exports = {
  apps: [
    {
      name: 'helperdesktop-server',
      cwd: path.resolve(__dirname, '..'),
      script: 'apps/server/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '512M',
      kill_timeout: 10000,
      wait_ready: false,
      listen_timeout: 10000,
      time: true,
      env: {
        NODE_ENV: 'production',
        HELPER_SERVER_AUTOSTART: '1',
        HELPER_BOT_AUTOSTART: '1',
      },
      env_production: {
        NODE_ENV: 'production',
        HELPER_SERVER_AUTOSTART: '1',
        HELPER_BOT_AUTOSTART: '1',
      },
      error_file: 'logs/server-error.log',
      out_file: 'logs/server-out.log',
      merge_logs: true,
    },
  ],
};
