-- ==========================================================
-- UtmTracker Pro - Schema Oficial PostgreSQL (Supabase / Neon)
-- Execute este script no SQL Editor do Supabase se desejar
-- criar as tabelas manualmente (embora o sistema crie automaticamente).
-- ==========================================================

-- 1. Tabela de Produtos (Multi-Produto)
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    meta_pixel_id VARCHAR(100) NOT NULL,
    meta_access_token TEXT NOT NULL,
    meta_test_event_code VARCHAR(100),
    webhook_secret VARCHAR(100),
    destination_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Cliques e Visitas (O coração da atribuição)
CREATE TABLE IF NOT EXISTS clicks (
    id VARCHAR(50) PRIMARY KEY,
    product_id VARCHAR(50) REFERENCES products(id) ON DELETE CASCADE,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(255),
    utm_content VARCHAR(255),
    utm_term VARCHAR(255),
    fbclid TEXT,
    fbc TEXT,
    fbp TEXT,
    client_ip VARCHAR(50),
    client_user_agent TEXT,
    page_url TEXT,
    referrer TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clicks_created_at ON clicks(created_at);
CREATE INDEX IF NOT EXISTS idx_clicks_product_campaign ON clicks(product_id, utm_campaign);

-- 3. Tabela de Conversões e Webhooks (Checkout e Compras Aprovadas)
CREATE TABLE IF NOT EXISTS conversions (
    id VARCHAR(50) PRIMARY KEY,
    click_id VARCHAR(50),
    product_id VARCHAR(50) REFERENCES products(id) ON DELETE CASCADE,
    event_name VARCHAR(50) NOT NULL,
    event_id VARCHAR(150) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    platform_order_id VARCHAR(100) NOT NULL,
    order_amount NUMERIC(10, 2) DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'BRL',
    order_status VARCHAR(50) NOT NULL,
    customer_email_hash VARCHAR(64),
    customer_phone_hash VARCHAR(64),
    customer_name VARCHAR(255),
    capi_status VARCHAR(20) DEFAULT 'pending',
    capi_response_code INTEGER,
    capi_error_message TEXT,
    raw_payload TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversions_click_id ON conversions(click_id);
CREATE INDEX IF NOT EXISTS idx_conversions_created_at ON conversions(created_at);
