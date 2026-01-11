const axios = require('axios');

const CATALOG_SERVICE_URL = process.env.CATALOG_SERVICE_URL || 'http://catalog-service:3002';

/**
 * Cliente HTTP para comunicarse con el Catalog Service
 * Esta es la CLAVE de la arquitectura de microservicios:
 * Orders Service NO tiene acceso directo a la BD de productos,
 * debe hacer llamadas HTTP al Catalog Service
 */

async function getProduct(productId) {
    try {
        console.log(`[Orders Service] 🌐 Llamada HTTP a Catalog Service: GET /catalog/products/${productId}`);

        const response = await axios.get(`${CATALOG_SERVICE_URL}/catalog/products/${productId}`, {
            timeout: 5000 // 5 segundos timeout
        });

        console.log(`[Orders Service] ✅ Respuesta de Catalog Service: ${response.data.product.name}`);

        return response.data.product;
    } catch (error) {
        if (error.response) {
            // El Catalog Service respondió con error
            console.error(`[Orders Service] ❌ Catalog Service error: ${error.response.status}`);
            if (error.response.status === 404) {
                return null; // Producto no encontrado
            }
        } else if (error.code === 'ECONNREFUSED') {
            // Catalog Service no está disponible
            console.error('[Orders Service] ❌ Catalog Service no disponible (ECONNREFUSED)');
            throw new Error('Catalog Service no disponible');
        } else {
            console.error('[Orders Service] ❌ Error en llamada a Catalog Service:', error.message);
        }
        throw error;
    }
}

module.exports = {
    getProduct
};
