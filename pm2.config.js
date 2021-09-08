module.exports = {
  apps: [{
    name: 'pepeger',
    cwd: __dirname,
    script: 'node',
    args: 'dist/src/index.js',
    watch: false,
    max_memory_restart: '1G',
    merge_logs: true,
    log_type: 'json',
  }],
}
