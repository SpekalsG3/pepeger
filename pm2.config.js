module.exports = {
  apps: [{
    name: 'nowloans-core',
    cwd: __dirname,
    script: 'node',
    args: 'dist/src/index',
    watch: false,
    max_memory_restart: '1G',
    merge_logs: true,
    log_type: 'json',
  }],
}
