const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    query_timeout: 10000,
});

pool.on('connect', () => {
    console.log('[Auth Service] Conectado a PostgreSQL');
});

pool.on('error', (err) => {
    console.error('[Auth Service] Error en PostgreSQL:', err);
});

module.exports = pool;
