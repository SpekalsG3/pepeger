module.exports = {
  apps: [{
    name: 'pepeger',
    cwd: __dirname,
    script: 'node',
    args: 'dist/src/index.js',
    watch: false,
    cron_restart: '0 0 * * *',
    max_memory_restart: '1G',
    merge_logs: true,
    log_type: 'json',
  }],
}
