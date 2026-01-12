const mysql = require('mysql2/promise');

// Create a MySQL connection pool.  mysql2 supports passing a DSN string directly.
const pool = mysql.createPool(process.env.DATABASE_URL);

// Attempt an initial connection to log status.  We release it immediately.
pool.getConnection()
    .then((connection) => {
        console.log('[Catalog Service] Conectado a MySQL');
        connection.release();
    })
    .catch((err) => {
        console.error('[Catalog Service] Error en MySQL:', err);
    });

module.exports = pool;
