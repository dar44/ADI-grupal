const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const catalogClient = require('./catalogClient');

const app = express();
const PORT = process.env.PORT || 3003;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123456';

app.use(express.json());

// Middleware de autenticación
const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token ausente o inválido' });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);

        req.user = { id: decoded.userId };
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
};

// ============ HEALTH ============
app.get('/orders/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ ok: true, service: 'orders-service', database: 'connected' });
    } catch (error) {
        res.status(503).json({ ok: false, service: 'orders-service', database: 'disconnected' });
    }
});

// ============ ORDERS ENDPOINTS ============

// Listar pedidos del usuario
app.get('/orders', requireAuth, async (req, res) => {
    try {
        const ordersResult = await pool.query(
            'SELECT id, total_cents, created_at FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );

        const orders = [];
        for (const orderRow of ordersResult.rows) {
            const itemsResult = await pool.query(
                'SELECT product_id, product_name, unit_price_cents, quantity FROM order_items WHERE order_id = $1',
                [orderRow.id]
            );

            const items = itemsResult.rows.map(item => ({
                productId: item.product_id,
                productName: item.product_name,
                unitPriceCents: item.unit_price_cents,
                quantity: item.quantity
            }));

            orders.push({
                id: orderRow.id,
                totalCents: orderRow.total_cents,
                createdAt: orderRow.created_at.toISOString(),
                items
            });
        }

        console.log(`[Orders Service] Usuario ${req.user.id} tiene ${orders.length} pedidos`);

        res.json({ orders });
    } catch (error) {
        console.error('[Orders Service] Error en GET /orders:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Crear pedido (con llamada HTTP a Catalog Service)
app.post('/orders', requireAuth, async (req, res) => {
    const client = await pool.connect();
    try {
        const { items } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Items es requerido y debe ser un array no vacío' });
        }

        // Validar items
        for (const item of items) {
            if (!item.productId || !item.quantity || item.quantity <= 0) {
                return res.status(400).json({ error: 'Cada item debe tener productId y quantity válidos' });
            }
        }

        await client.query('BEGIN');

        console.log(`[Orders Service] 📦 Creando pedido para usuario ${req.user.id} con ${items.length} items`);

        // CLAVE: Validar productos llamando al Catalog Service por HTTP
        let totalCents = 0;
        const validatedItems = [];

        for (const item of items) {
            try {
                // 🌐 LLAMADA HTTP AL CATALOG SERVICE
                const product = await catalogClient.getProduct(item.productId);

                if (!product) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ error: `Producto con id ${item.productId} no existe` });
                }

                const itemTotal = product.priceCents * item.quantity;
                totalCents += itemTotal;

                validatedItems.push({
                    productId: product.id,
                    productName: product.name,
                    unitPriceCents: product.priceCents,
                    quantity: item.quantity
                });

                console.log(`[Orders Service] ✅ Producto validado: ${product.name} x${item.quantity}`);

            } catch (error) {
                await client.query('ROLLBACK');
                console.error('[Orders Service] Error validando producto:', error.message);
                return res.status(503).json({
                    error: 'Catalog Service no disponible. No se puede validar productos.'
                });
            }
        }

        // Crear pedido
        const orderResult = await client.query(
            'INSERT INTO orders (user_id, total_cents) VALUES ($1, $2) RETURNING id, total_cents, created_at',
            [req.user.id, totalCents]
        );

        const order = orderResult.rows[0];

        // Insertar items
        for (const item of validatedItems) {
            await client.query(
                'INSERT INTO order_items (order_id, product_id, product_name, unit_price_cents, quantity) VALUES ($1, $2, $3, $4, $5)',
                [order.id, item.productId, item.productName, item.unitPriceCents, item.quantity]
            );
        }

        await client.query('COMMIT');

        console.log(`[Orders Service] ✅ Pedido #${order.id} creado exitosamente`);

        res.status(201).json({
            order: {
                id: order.id,
                totalCents: order.total_cents,
                createdAt: order.created_at.toISOString(),
                items: validatedItems
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[Orders Service] Error en POST /orders:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        client.release();
    }
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Orders Service] Escuchando en puerto ${PORT}`);
});
