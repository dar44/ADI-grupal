const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123456';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

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
app.get('/auth/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ ok: true, service: 'auth-service', database: 'connected' });
    } catch (error) {
        res.status(503).json({ ok: false, service: 'auth-service', database: 'disconnected' });
    }
});

// ============ AUTH ENDPOINTS ============

// Login
app.post('/auth/login', async (req, res) => {
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
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        console.log(`[Auth Service] Login exitoso para: ${email}`);

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email
            }
        });
    } catch (error) {
        console.error('[Auth Service] Error en /auth/login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Get authenticated user
app.get('/auth/me', requireAuth, (req, res) => {
    res.json({
        user: {
            id: req.user.id,
            email: req.user.email
        }
    });
});

// Verify token (endpoint para otros servicios)
app.post('/auth/verify', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token requerido' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const result = await pool.query('SELECT id, email FROM users WHERE id = $1', [decoded.userId]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }

        res.json({
            valid: true,
            user: {
                id: result.rows[0].id,
                email: result.rows[0].email
            }
        });
    } catch (error) {
        res.status(401).json({ valid: false, error: 'Token inválido' });
    }
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Auth Service] Escuchando en puerto ${PORT}`);
});
