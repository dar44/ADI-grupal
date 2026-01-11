# 🧪 Guía Paso a Paso para Probar los Microservicios

## 📋 Requisitos Previos

- Docker Desktop instalado y corriendo
- Terminal (PowerShell o CMD)

---

## 🚀 Paso 1: Levantar los Servicios

### 1.1 Abrir terminal en el directorio correcto

```powershell
cd c:\Users\ivida\Desktop\ADI-grupal\microservicios
```

### 1.2 Levantar todos los servicios con Docker Compose

```powershell
docker compose up --build
```

**¿Qué hace esto?**
- Construye las imágenes Docker de los 4 servicios
- Levanta 3 bases de datos PostgreSQL
- Ejecuta los scripts SQL de inicialización
- Inicia todos los servicios

**Espera a ver estos mensajes:**
```
[Auth Service] Escuchando en puerto 3001
[Catalog Service] Escuchando en puerto 3002
[Orders Service] Escuchando en puerto 3003
[API Gateway] 🌐 Escuchando en puerto 8080
```

> **Nota:** La primera vez tardará más porque tiene que descargar imágenes y construir todo.

---

## ✅ Paso 2: Verificar que Todo Está Corriendo

### 2.1 Ver el estado de los contenedores

Abre **otra terminal** (deja la primera corriendo) y ejecuta:

```powershell
docker compose ps
```

**Deberías ver 7 contenedores:**
```
NAME                STATUS
auth-db             Up (healthy)
catalog-db          Up (healthy)
orders-db           Up (healthy)
auth-service        Up
catalog-service     Up
orders-service      Up
api-gateway         Up
```

### 2.2 Verificar Health Checks

Abre tu navegador o usa `curl` en PowerShell:

```powershell
# API Gateway
curl http://localhost:8080/health

# Auth Service
curl http://localhost:3001/auth/health

# Catalog Service
curl http://localhost:3002/catalog/health

# Orders Service
curl http://localhost:3003/orders/health
```

**Todos deberían responder:**
```json
{"ok": true, "service": "...", "database": "connected"}
```

---

## 🌐 Paso 3: Probar desde el Navegador (Más Fácil)

### 3.1 Abrir el Frontend

1. Abre tu navegador
2. Ve a: **http://localhost:8080**
3. Deberías ver la interfaz del e-commerce

### 3.2 Hacer Login

- **Email:** `demo@demo.com`
- **Password:** `demo1234`
- Click en **"Iniciar Sesión"**

**Deberías ver:** "¡Sesión iniciada correctamente!"

### 3.3 Cargar Productos

- Click en **"Cargar Productos"**
- Deberías ver una tabla con 4 productos:
  - Laptop Lenovo ThinkPad - 899.99€
  - Mouse Inalámbrico Logitech - 24.99€
  - Teclado Mecánico Corsair - 79.99€
  - Monitor LG 27 pulgadas - 349.99€

### 3.4 Crear un Pedido (⭐ Aquí se ve la llamada HTTP entre servicios)

1. Click en **"Añadir al Carrito"** en cualquier producto
2. Ve a la sección "Carrito de Compras"
3. Click en **"Crear Pedido"**

**En la terminal donde corre `docker compose up`, deberías ver:**

```
[API Gateway] 🔀 Proxy: POST /orders → Orders Service
[Orders Service] 📦 Creando pedido para usuario 1 con 1 items
[Orders Service] 🌐 Llamada HTTP a Catalog Service: GET /catalog/products/1
[Catalog Service] Producto 1 solicitado: Laptop Lenovo ThinkPad
[Orders Service] ✅ Respuesta de Catalog Service: Laptop Lenovo ThinkPad
[Orders Service] ✅ Producto validado: Laptop Lenovo ThinkPad x1
[Orders Service] ✅ Pedido #1 creado exitosamente
```

**Esto demuestra que Orders Service está haciendo llamadas HTTP a Catalog Service!** 🎉

### 3.5 Ver tus Pedidos

- Click en **"Cargar Pedidos"**
- Deberías ver el pedido que acabas de crear

---

## 🧪 Paso 4: Probar con cURL (Más Técnico)

Si quieres probar directamente con la API:

### 4.1 Login y Obtener Token

```powershell
curl -X POST http://localhost:8080/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"demo@demo.com\",\"password\":\"demo1234\"}'
```

**Copia el token de la respuesta** (el texto largo después de "token":)

### 4.2 Listar Productos

```powershell
curl http://localhost:8080/catalog/products
```

### 4.3 Crear Pedido

```powershell
# Reemplaza TU_TOKEN_AQUI con el token del paso 4.1
curl -X POST http://localhost:8080/orders `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer TU_TOKEN_AQUI" `
  -d '{\"items\":[{\"productId\":1,\"quantity\":2}]}'
```

**Mira los logs en la terminal** para ver la comunicación entre servicios!

---

## 🔥 Paso 5: Demostrar Fallo de Servicio (Avanzado)

Esto demuestra la **desventaja** de microservicios: dependencia de servicios externos.

### 5.1 Detener el Catalog Service

En una nueva terminal:

```powershell
cd c:\Users\ivida\Desktop\ADI-grupal\microservicios
docker compose stop catalog-service
```

### 5.2 Intentar Crear un Pedido

Desde el navegador o con cURL, intenta crear un pedido.

**Deberías ver el error:**
```
"Catalog Service no disponible. No se puede validar productos."
```

**En los logs:**
```
[Orders Service] ❌ Catalog Service no disponible (ECONNREFUSED)
```

Esto demuestra que **sin Catalog Service, Orders no puede funcionar** (vs el monolito donde todo está en una app).

### 5.3 Reiniciar Catalog Service

```powershell
docker compose start catalog-service
```

Ahora vuelve a funcionar! ✅

---

## 📊 Paso 6: Comparar con el Monolito

### 6.1 Detener Microservicios

```powershell
# En la terminal donde corre docker compose up
Ctrl + C

# Luego
docker compose down
```

### 6.2 Levantar el Monolito

```powershell
cd c:\Users\ivida\Desktop\ADI-grupal\monolito
docker compose up --build
```

### 6.3 Probar el Monolito

- Ve a: **http://localhost:8080**
- Usa las mismas credenciales: `demo@demo.com` / `demo1234`
- Crea un pedido

**Observa los logs:**
```
[Monolito] No hay llamadas HTTP entre servicios
[Monolito] Todo es SQL directo en la misma base de datos
```

### 6.4 Comparación

| Aspecto | Monolito | Microservicios |
|---------|----------|----------------|
| **Validar producto** | `SELECT * FROM products` | `HTTP GET a Catalog Service` |
| **Logs** | Simples, todo en un lugar | Distribuidos entre servicios |
| **Latencia** | ~5-10ms | ~30-50ms |
| **Si falla Catalog** | No aplica (todo junto) | Orders no puede crear pedidos |

---

## 🛠️ Comandos Útiles

### Ver Logs en Tiempo Real

```powershell
# Todos los servicios
docker compose logs -f

# Solo Orders Service (para ver llamadas HTTP)
docker compose logs -f orders-service

# Solo Catalog Service
docker compose logs -f catalog-service
```

### Reiniciar un Servicio

```powershell
docker compose restart orders-service
```

### Detener Todo

```powershell
docker compose down
```

### Detener y Borrar Bases de Datos (Reset Completo)

```powershell
docker compose down -v
```

### Ver Bases de Datos

Puedes conectarte a las bases de datos con cualquier cliente PostgreSQL:

- **auth_db:** localhost:5432, user: postgres, password: postgres
- **catalog_db:** localhost:5433, user: postgres, password: postgres
- **orders_db:** localhost:5434, user: postgres, password: postgres

---

## ❓ Troubleshooting

### Error: "Cannot connect to Docker daemon"

**Solución:** Abre Docker Desktop y espera a que inicie completamente.

### Error: "Port 8080 is already in use"

**Solución:** Algún otro servicio está usando el puerto. Cierra cualquier aplicación que esté usando el puerto 8080.

> **Nota:** El API Gateway ahora corre en el puerto 8080 para evitar conflictos con el auth-service (puerto 3001).

### Error: "Service 'xxx' failed to build"

**Solución:** Revisa los logs de error. Puede ser un problema con package.json o Dockerfile.

### No veo los logs de llamadas HTTP

**Solución:** Asegúrate de estar viendo los logs de `orders-service`:
```powershell
docker compose logs -f orders-service
```

---

## 🎯 Checklist de Pruebas

- [ ] Levantar servicios con `docker compose up --build`
- [ ] Verificar que 7 contenedores están corriendo
- [ ] Abrir http://localhost:8080 en el navegador
- [ ] Login con demo@demo.com / demo1234
- [ ] Cargar productos
- [ ] Añadir productos al carrito
- [ ] Crear pedido
- [ ] **Ver en logs la llamada HTTP de Orders a Catalog** 🎉
- [ ] Ver pedidos creados
- [ ] Detener Catalog Service y ver el error
- [ ] Reiniciar Catalog Service
- [ ] Comparar con el monolito

---

## 🎓 ¿Qué Estás Demostrando?

1. **Separación de servicios:** Auth, Catalog y Orders son independientes
2. **Bases de datos separadas:** Cada servicio tiene su propia BD
3. **Comunicación HTTP:** Orders llama a Catalog por red (no SQL directo)
4. **API Gateway:** Punto de entrada único que enruta a servicios
5. **Trade-offs:** Mayor latencia y complejidad vs independencia y escalabilidad

---

**¡Listo para probar! Si tienes problemas, revisa los logs con `docker compose logs -f`**
