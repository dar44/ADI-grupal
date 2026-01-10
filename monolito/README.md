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

## Guion de Demo (Monolito)

### Introducción (15–25 segundos)
> "Hola, somos el grupo X y en este trabajo comparamos backend monolítico versus microservicios usando el mismo mini e-commerce. Yo voy a mostrar la implementación monolítica; después mis compañeros enseñarán la arquitectura de microservicios y haremos la comparación final."

### Pasos de Demostración

1. **Arrancar el sistema**
   ```bash
   cd monolito
   docker compose up --build
   ```
   - Mostrar logs: PostgreSQL iniciado, app conectada

2. **Abrir navegador** → `http://localhost:8080`

3. **Login**
   - Email: `demo@demo.com`
   - Password: `demo1234`
   - Mostrar mensaje de éxito y email del usuario

4. **Cargar productos**
   - Clic en "Cargar Productos"
   - Mostrar tabla con 4 productos (Laptop, Mouse, Teclado, Monitor)

5. **Añadir al carrito**
   - Añadir 2–3 productos diferentes
   - Mostrar actualización del carrito y total

6. **Crear pedido**
   - Clic en "Crear Pedido"
   - Mostrar mensaje de confirmación con ID de pedido

7. **Cargar pedidos**
   - Clic en "Cargar Pedidos"
   - Mostrar pedido recién creado con items y total

8. **Opcional:** Mostrar código relevante
   - `server.js` → endpoint `POST /orders` con transacción SQL
   - `init.sql` → tablas en una sola DB

### Demostración de Endpoints API en el Navegador (Opcional)

**A. Endpoints GET - Acceso Directo:**

1. **Health Check** - Abrir en nueva pestaña:
   ```
   http://localhost:8080/health
   ```
   Verás: `{"ok":true,"service":"monolito"}`

2. **Listar Productos** - Abrir en nueva pestaña:
   ```
   http://localhost:8080/products
   ```
   Verás: JSON con array de productos (Laptop, Mouse, Teclado, Monitor)

3. **Producto Individual** - Abrir en nueva pestaña:
   ```
   http://localhost:8080/products/1
   ```
   Verás: Detalles del producto con id=1 (Laptop)

**B. Endpoints con Autenticación - Usar la UI:**

La interfaz web en `http://localhost:8080` ya implementa todos los endpoints:
- **Login** → Sección "Autenticación"
- **Productos** → Botón "Cargar Productos"
- **Crear Pedido** → Botón "Crear Pedido" (tras añadir items al carrito)
- **Ver Pedidos** → Botón "Cargar Pedidos"

**C. Ver Requests/Responses en Consola (F12):**

1. Abrir DevTools (F12) → Pestaña "Network"
2. Hacer login en la interfaz
3. Ver el request `POST /login` con:
   - **Request Payload:** `{"email":"demo@demo.com","password":"demo1234"}`
   - **Response:** Token JWT y datos del usuario
4. Cargar productos y ver request `GET /products`
5. Crear pedido y ver request `POST /orders` con:
   - **Headers:** `Authorization: Bearer eyJhbGci...`
   - **Request Payload:** Array de items
   - **Response:** Pedido creado con ID y total

**D. Probar Endpoints desde Consola del Navegador (F12):**

```javascript
// Health Check
fetch('http://localhost:8080/health')
  .then(r => r.json())
  .then(data => console.log('Health:', data));

// Login y guardar token
fetch('http://localhost:8080/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({email: 'demo@demo.com', password: 'demo1234'})
})
  .then(r => r.json())
  .then(data => {
    console.log('Login:', data);
    window.token = data.token; // Guardar para siguientes requests
  });

// Crear pedido (requiere hacer login primero)
fetch('http://localhost:8080/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${window.token}`
  },
  body: JSON.stringify({
    items: [{productId: 1, quantity: 2}, {productId: 2, quantity: 1}]
  })
})
  .then(r => r.json())
  .then(data => console.log('Pedido creado:', data));
```

### Cierre y Transición (10–15 segundos)
> "Como han visto, el monolito es simple: una aplicación, una base de datos, todo en el mismo proceso. Validar productos es una consulta SQL directa. Ahora mis compañeros van a mostrar la arquitectura de microservicios, donde Auth, Catalog y Orders son servicios separados que se comunican a través de un Gateway, con sus propias bases de datos y estrategias de tolerancia a fallos."

---

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

