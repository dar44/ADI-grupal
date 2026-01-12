const express = require('express');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

// ============ HEALTH ============
app.get('/catalog/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ ok: true, service: 'catalog-service', database: 'connected' });
    } catch (error) {
        res.status(503).json({ ok: false, service: 'catalog-service', database: 'disconnected' });
    }
});

// ============ CATALOG ENDPOINTS ============

// Listar todos los productos
app.get('/catalog/products', async (req, res) => {
    try {
        // In MySQL, pool.query returns an array: [rows, fields]
        const [rows] = await pool.query('SELECT id, name, price_cents, stock FROM products ORDER BY id');

        const products = rows.map(row => ({
            id: row.id,
            name: row.name,
            priceCents: row.price_cents,
            stock: row.stock
        }));

        console.log(`[Catalog Service] Listando ${products.length} productos`);

        res.json({ products });
    } catch (error) {
        console.error('[Catalog Service] Error en /catalog/products:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener un producto por ID (usado por Orders Service)
app.get('/catalog/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Use ? placeholder for parameters in MySQL
        const [rows] = await pool.query('SELECT id, name, price_cents, stock FROM products WHERE id = ?', [id]);

        if (rows.length === 0) {
            console.log(`[Catalog Service] Producto ${id} no encontrado`);
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        const row = rows[0];
        const product = {
            id: row.id,
            name: row.name,
            priceCents: row.price_cents,
            stock: row.stock
        };

        console.log(`[Catalog Service] Producto ${id} solicitado: ${product.name}`);

        res.json({ product });
    } catch (error) {
        console.error('[Catalog Service] Error en /catalog/products/:id:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Catalog Service] Escuchando en puerto ${PORT}`);
});
