let token = null;
let cart = [];

// API Gateway URL
const API_BASE = '';

// ============ UTILIDADES ============
function showMessage(text, type = 'success') {
    const messageDiv = document.getElementById('message');
    messageDiv.innerHTML = `<div class="message ${type}">${text}</div>`;
    setTimeout(() => {
        messageDiv.innerHTML = '';
    }, 5000);
}

function formatPrice(priceCents) {
    return `${(priceCents / 100).toFixed(2)}€`;
}

// ============ AUTH ============
async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        // Llamada al API Gateway que hace proxy a Auth Service
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            showMessage(data.error || 'Error al iniciar sesión', 'error');
            return;
        }

        token = data.token;
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('userInfo').classList.add('visible');
        document.getElementById('userEmail').textContent = data.user.email;
        showMessage('¡Sesión iniciada correctamente!', 'success');
    } catch (error) {
        showMessage('Error de conexión: ' + error.message, 'error');
    }
}

function logout() {
    token = null;
    cart = [];
    document.getElementById('loginForm').style.display = 'flex';
    document.getElementById('userInfo').classList.remove('visible');
    document.getElementById('productsContainer').innerHTML = '';
    document.getElementById('cartContainer').innerHTML = '<div class="empty-state">El carrito está vacío</div>';
    document.getElementById('cartTotal').classList.add('hidden');
    document.getElementById('createOrderBtn').style.display = 'none';
    document.getElementById('ordersContainer').innerHTML = '';
    showMessage('Sesión cerrada', 'success');
}

// ============ PRODUCTOS ============
async function loadProducts() {
    try {
        // Llamada al API Gateway que hace proxy a Catalog Service
        const response = await fetch(`${API_BASE}/catalog/products`);
        const data = await response.json();

        if (!response.ok) {
            showMessage(data.error || 'Error al cargar productos', 'error');
            return;
        }

        displayProducts(data.products);
    } catch (error) {
        showMessage('Error de conexión: ' + error.message, 'error');
    }
}

function displayProducts(products) {
    const container = document.getElementById('productsContainer');

    if (products.length === 0) {
        container.innerHTML = '<div class="empty-state">No hay productos disponibles</div>';
        return;
    }

    let html = '<table><thead><tr><th>ID</th><th>Nombre</th><th>Precio</th><th>Stock</th><th>Acción</th></tr></thead><tbody>';

    products.forEach(product => {
        html += `
      <tr>
        <td>${product.id}</td>
        <td>${product.name}</td>
        <td>${formatPrice(product.priceCents)}</td>
        <td>${product.stock}</td>
        <td><button class="btn-success btn-small" onclick="addToCart(${product.id}, '${product.name}', ${product.priceCents})">Añadir al Carrito</button></td>
      </tr>
    `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// ============ CARRITO ============
function addToCart(productId, productName, priceCents) {
    const existingItem = cart.find(item => item.productId === productId);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            productId,
            productName,
            priceCents,
            quantity: 1
        });
    }

    displayCart();
    showMessage(`${productName} añadido al carrito`, 'success');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.productId !== productId);
    displayCart();
    showMessage('Producto eliminado del carrito', 'success');
}

function displayCart() {
    const container = document.getElementById('cartContainer');
    const totalDiv = document.getElementById('cartTotal');
    const createOrderBtn = document.getElementById('createOrderBtn');

    if (cart.length === 0) {
        container.innerHTML = '<div class="empty-state">El carrito está vacío</div>';
        totalDiv.classList.add('hidden');
        createOrderBtn.style.display = 'none';
        return;
    }

    let html = '';
    let total = 0;

    cart.forEach(item => {
        const itemTotal = item.priceCents * item.quantity;
        total += itemTotal;

        html += `
      <div class="cart-item">
        <div>
          <strong>${item.productName}</strong><br>
          <small>${formatPrice(item.priceCents)} x ${item.quantity} = ${formatPrice(itemTotal)}</small>
        </div>
        <button class="btn-danger btn-small" onclick="removeFromCart(${item.productId})">Eliminar</button>
      </div>
    `;
    });

    container.innerHTML = html;
    totalDiv.innerHTML = `Total: ${formatPrice(total)}`;
    totalDiv.classList.remove('hidden');
    createOrderBtn.style.display = 'inline-block';
}

// ============ PEDIDOS ============
async function createOrder() {
    if (!token) {
        showMessage('Debes iniciar sesión para crear un pedido', 'error');
        return;
    }

    if (cart.length === 0) {
        showMessage('El carrito está vacío', 'error');
        return;
    }

    const items = cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity
    }));

    try {
        // Llamada al API Gateway que hace proxy a Orders Service
        // Orders Service hará llamadas HTTP a Catalog Service para validar productos
        const response = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ items })
        });

        const data = await response.json();

        if (!response.ok) {
            showMessage(data.error || 'Error al crear pedido', 'error');
            return;
        }

        showMessage(`¡Pedido #${data.order.id} creado! Total: ${formatPrice(data.order.totalCents)}`, 'success');
        cart = [];
        displayCart();
    } catch (error) {
        showMessage('Error de conexión: ' + error.message, 'error');
    }
}

async function loadOrders() {
    if (!token) {
        showMessage('Debes iniciar sesión para ver tus pedidos', 'error');
        return;
    }

    try {
        // Llamada al API Gateway que hace proxy a Orders Service
        const response = await fetch(`${API_BASE}/orders`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            showMessage(data.error || 'Error al cargar pedidos', 'error');
            return;
        }

        displayOrders(data.orders);
    } catch (error) {
        showMessage('Error de conexión: ' + error.message, 'error');
    }
}

function displayOrders(orders) {
    const container = document.getElementById('ordersContainer');

    if (orders.length === 0) {
        container.innerHTML = '<div class="empty-state">No tienes pedidos aún</div>';
        return;
    }

    let html = '';

    orders.forEach(order => {
        const date = new Date(order.createdAt).toLocaleString('es-ES');

        html += `
      <div class="order-card">
        <div class="order-header">
          <span>Pedido #${order.id}</span>
          <span>${formatPrice(order.totalCents)}</span>
        </div>
        <div><small>${date}</small></div>
        <div class="order-items">
          ${order.items.map(item => `
            <div class="order-item">• ${item.productName || 'Producto ' + item.productId} - ${formatPrice(item.unitPriceCents)} x ${item.quantity}</div>
          `).join('')}
        </div>
      </div>
    `;
    });

    container.innerHTML = html;
}
