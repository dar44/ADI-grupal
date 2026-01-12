-- Base de datos del Catalog Service (MySQL)
-- Tabla de productos

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price_cents INT NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Productos de prueba
INSERT INTO products (name, price_cents, stock) VALUES
  ('Laptop Lenovo ThinkPad', 89999, 15),
  ('Mouse Inalámbrico Logitech', 2499, 50),
  ('Teclado Mecánico Corsair', 7999, 30),
  ('Monitor LG 27 pulgadas', 34999, 20)
  ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Índice para búsquedas
CREATE INDEX idx_products_id ON products(id);
