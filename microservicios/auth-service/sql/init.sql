-- Base de datos del Auth Service
-- Tabla de usuarios

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Usuario demo
-- Password: demo1234
-- Hash generado con bcrypt (10 rounds)
INSERT INTO users (email, password_hash) VALUES 
('demo@demo.com', '$2b$10$bSo3rq3ON1mFkVB3N6UmY.NRzZbA4thvf3Pqyw3Yw/ykZ8X.m5/Fa')
ON CONFLICT (email) DO NOTHING;

-- Índice para búsquedas por email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
