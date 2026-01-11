const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
    console.log('[Catalog Service] Conectado a PostgreSQL');
});

pool.on('error', (err) => {
    console.error('[Catalog Service] Error en PostgreSQL:', err);
});

module.exports = pool;
