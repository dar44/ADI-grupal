const mysql = require('mysql2/promise');

// Create a MySQL connection pool using the DSN provided in DATABASE_URL.
const pool = mysql.createPool(process.env.DATABASE_URL);

// Log connection status on startup.
pool.getConnection()
    .then((connection) => {
        console.log('[Orders Service] Conectado a MySQL');
        connection.release();
    })
    .catch((err) => {
        console.error('[Orders Service] Error en MySQL:', err);
    });

module.exports = pool;
