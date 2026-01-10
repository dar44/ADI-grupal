const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123456';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Middleware de autenticación
const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token ausente o inválido' });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);

        const result = await pool.query('SELECT id, email FROM users WHERE id = $1', [decoded.userId]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }

        req.user = result.rows[0];
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token inválido o expirado' });
        }
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// ============ HEALTH ============
app.get('/health', (req, res) => {
    res.json({ ok: true, service: 'monolito' });
});

// ============ AUTH ============
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y password son requeridos' });
        }

        const result = await pool.query('SELECT id, email, password_hash FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const user = result.rows[0];

        console.log('DEBUG Login:');
        console.log('- Email:', email);
        console.log('- Password recibido:', password);
        console.log('- Hash en DB:', user.password_hash);

        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        console.log('- bcrypt.compare result:', isValidPassword);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Error en /login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/me', requireAuth, (req, res) => {
    res.json({
        user: {
            id: req.user.id,
            email: req.user.email
        }
    });
});

// ============ CATÁLOGO ============
app.get('/products', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, price_cents, stock FROM products ORDER BY id');

        const products = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            priceCents: row.price_cents,
            stock: row.stock
        }));

        res.json({ products });
    } catch (error) {
        console.error('Error en /products:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT id, name, price_cents, stock FROM products WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Producto no encontrado' });
        }

        const row = result.rows[0];
        const product = {
            id: row.id,
            name: row.name,
            priceCents: row.price_cents,
            stock: row.stock
        };

        res.json({ product });
    } catch (error) {
        console.error('Error en /products/:id:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ============ PEDIDOS ============
app.get('/orders', requireAuth, async (req, res) => {
    try {
        const ordersResult = await pool.query(
            'SELECT id, total_cents, created_at FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );

        const orders = [];
        for (const orderRow of ordersResult.rows) {
            const itemsResult = await pool.query(
                'SELECT product_id, unit_price_cents, quantity FROM order_items WHERE order_id = $1',
                [orderRow.id]
            );

            const items = itemsResult.rows.map(item => ({
                productId: item.product_id,
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

        res.json({ orders });
    } catch (error) {
        console.error('Error en /orders GET:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

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

        // Validar que todos los productos existen y obtener precios
        let totalCents = 0;
        const validatedItems = [];

        for (const item of items) {
            const productResult = await client.query(
                'SELECT id, price_cents FROM products WHERE id = $1',
                [item.productId]
            );

            if (productResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: `Producto con id ${item.productId} no existe` });
            }

            const product = productResult.rows[0];
            const itemTotal = product.price_cents * item.quantity;
            totalCents += itemTotal;

            validatedItems.push({
                productId: product.id,
                unitPriceCents: product.price_cents,
                quantity: item.quantity
            });
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
                'INSERT INTO order_items (order_id, product_id, unit_price_cents, quantity) VALUES ($1, $2, $3, $4)',
                [order.id, item.productId, item.unitPriceCents, item.quantity]
            );
        }

        await client.query('COMMIT');

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
        console.error('Error en /orders POST:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        client.release();
    }
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor monolito escuchando en puerto ${PORT}`);
});
