module.exports = {
    apps: [{
        name: 'el-cuartito-api',
        script: 'ts-node',
        args: 'src/server.ts',
        watch: ['src'],
        ignore_watch: ['node_modules', 'logs', '*.log', 'dist'],
        env: {
            NODE_ENV: 'development',
            PORT: 3001
        },
        env_production: {
            NODE_ENV: 'production',
            PORT: process.env.PORT || 3001
        },
        error_file: './logs/err.log',
        out_file: './logs/out.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss',
        max_memory_restart: '500M',
        autorestart: true,
        max_restarts: 10,
        min_uptime: '10s',
        restart_delay: 1000
    }]
};
