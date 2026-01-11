const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
const CATALOG_SERVICE_URL = process.env.CATALOG_SERVICE_URL || 'http://catalog-service:3002';
const ORDERS_SERVICE_URL = process.env.ORDERS_SERVICE_URL || 'http://orders-service:3003';

// CORS para permitir peticiones del frontend
app.use(cors());
app.use(express.json());

// Servir archivos estáticos del frontend
app.use(express.static('public'));

// ============ HEALTH ============
app.get('/health', (req, res) => {
    res.json({
        ok: true,
        service: 'api-gateway',
        uptime: process.uptime()
    });
});

// ============ PROXY MANUAL A MICROSERVICIOS ============

// Proxy a Auth Service
app.all('/auth*', async (req, res) => {
    const path = req.url; // Esto incluye /auth...
    const url = `${AUTH_SERVICE_URL}${path}`;

    console.log(`[API Gateway] 🔀 Proxy: ${req.method} ${path} → ${url}`);

    // Filtrar headers problemáticos
    const headers = { ...req.headers };
    delete headers.host;
    delete headers['content-length']; // Importante: dejar que axios calcule esto

    console.log('[API Gateway] Headers a enviar:', JSON.stringify(headers));
    console.log('[API Gateway] Body a enviar:', JSON.stringify(req.body));

    try {
        const response = await axios({
            method: req.method,
            url: url,
            data: req.body,
            headers: headers,
            timeout: 10000,
            validateStatus: () => true,
        });

        console.log(`[API Gateway] ✅ Respuesta de Auth Service: ${response.status}`);
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('[API Gateway] ❌ Error en proxy a Auth Service:', error.message);
        if (error.code === 'ECONNREFUSED') {
            res.status(503).json({ error: 'Auth Service no disponible (Connection Refused)' });
        } else {
            res.status(503).json({ error: 'Error en API Gateway', details: error.message });
        }
    }
});

// Proxy a Catalog Service
app.all('/catalog*', async (req, res) => {
    const path = req.url;
    const url = `${CATALOG_SERVICE_URL}${path}`;

    console.log(`[API Gateway] 🔀 Proxy: ${req.method} ${path} → ${url}`);

    const headers = { ...req.headers };
    delete headers.host;
    delete headers['content-length'];

    try {
        const response = await axios({
            method: req.method,
            url: url,
            data: req.body,
            headers: headers,
            timeout: 10000,
            validateStatus: () => true,
        });

        console.log(`[API Gateway] ✅ Respuesta de Catalog Service: ${response.status}`);
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('[API Gateway] ❌ Error en proxy a Catalog Service:', error.message);
        res.status(503).json({ error: 'Catalog Service no disponible' });
    }
});

// Proxy a Orders Service
app.all('/orders*', async (req, res) => {
    const path = req.url;
    const url = `${ORDERS_SERVICE_URL}${path}`;

    console.log(`[API Gateway] 🔀 Proxy: ${req.method} ${path} → ${url}`);

    const headers = { ...req.headers };
    delete headers.host;
    delete headers['content-length'];

    try {
        const response = await axios({
            method: req.method,
            url: url,
            data: req.body,
            headers: headers,
            timeout: 10000,
            validateStatus: () => true,
        });

        console.log(`[API Gateway] ✅ Respuesta de Orders Service: ${response.status}`);
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('[API Gateway] ❌ Error en proxy a Orders Service:', error.message);
        res.status(503).json({ error: 'Orders Service no disponible' });
    }
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[API Gateway] 🌐 Escuchando en puerto ${PORT}`);
    console.log(`[API Gateway] Frontend disponible en http://localhost:${PORT}`);
    console.log(`[API Gateway] Auth Service: ${AUTH_SERVICE_URL}`);
    console.log(`[API Gateway] Catalog Service: ${CATALOG_SERVICE_URL}`);
    console.log(`[API Gateway] Orders Service: ${ORDERS_SERVICE_URL}`);
});
