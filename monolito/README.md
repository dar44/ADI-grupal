# E-commerce Monolito

Backend monolítico para mini e-commerce con Node.js, Express y PostgreSQL.

## Cómo ejecutar

```bash
cd monolito
docker compose up --build
```

La aplicación estará disponible en: **http://localhost:8080**

## Credenciales de Demo

- **Email:** `demo@demo.com`
- **Password:** `demo1234`

## Endpoints API

### Health
- `GET /health` - Verificar estado del servicio

### Auth
- `POST /login` - Iniciar sesión (body: `{ email, password }`)
- `GET /me` - Obtener usuario autenticado (requiere JWT)

### Catálogo
- `GET /products` - Listar todos los productos
- `GET /products/:id` - Obtener un producto específico

### Pedidos (requieren autenticación JWT)
- `GET /orders` - Listar pedidos del usuario
- `POST /orders` - Crear nuevo pedido (body: `{ items: [{ productId, quantity }] }`)

## Documentación API

La especificación OpenAPI 3.0 completa está disponible en `openapi.yaml`.

## Comparación Monolito vs Microservicios

### Monolito
- **Una única aplicación** con toda la lógica de negocio
- **Una única base de datos** compartida (users, products, orders, order_items)
- La validación de productos en pedidos se hace con una consulta SQL directa a la tabla `products`
- **Ventajas:** Simplicidad, transacciones ACID nativas, menor latencia
- **Desventajas:** Acoplamiento, escalabilidad limitada, punto único de fallo

### Microservicios (implementado por compañeros)
- **Servicios independientes:** Auth, Catalog, Orders + API Gateway
- **Bases de datos separadas** por servicio
- El servicio Orders debe llamar al servicio Catalog por red para validar productos
- **Ventajas:** Independencia, escalabilidad granular, tolerancia a fallos
- **Desventajas:** Complejidad en comunicación, consistencia eventual, mayor latencia


## Stack Tecnológico

- **Runtime:** Node.js 20
- **Framework:** Express
- **Base de datos:** PostgreSQL 15
- **Auth:** JWT + bcrypt
- **Containerización:** Docker + Docker Compose
- **Frontend:** HTML + Vanilla JavaScript

## Estructura del Proyecto

```
monolito/
├── docker-compose.yml
├── openapi.yaml
├── README.md
└── app/
    ├── Dockerfile
    ├── package.json
    ├── sql/
    │   └── init.sql
    ├── src/
    │   ├── server.js
    │   └── db.js
    └── public/
        ├── index.html
        └── app.js
```

## Flujo de Creación de Pedido

1. Usuario autenticado envía `POST /orders` con lista de items
2. Backend valida JWT y extrae `userId`
3. Inicia transacción SQL
4. Para cada item:
   - Verifica que `productId` existe en tabla `products`
   - Obtiene `price_cents` actual
   - Calcula total del item
5. Inserta registro en tabla `orders`
6. Inserta items en tabla `order_items`
7. Commit de transacción
8. Retorna pedido creado con items y total

> **Nota:** En la arquitectura de microservicios, el paso 4 requiere una llamada HTTP al servicio Catalog, introduciendo latencia de red y la necesidad de manejar fallos de comunicación.

