import { Pool } from "pg";
import { createClient } from "@libsql/client";
import path from "path";
import fs from "fs";

// Detect if we have a Postgres connection URL (Supabase, Neon, Render, etc.)
const databaseUrl = process.env.DATABASE_URL || "";
const isPostgres = databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://");

let pgPool: Pool | null = null;
let libsqlClient: any = null;

if (isPostgres) {
  pgPool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === "production" || databaseUrl.includes("supabase.co")
      ? { rejectUnauthorized: false }
      : undefined,
    max: 10,
    idleTimeoutMillis: 30000,
  });
} else {
  // Use local SQLite database via @libsql/client for local dev / fallback
  const dbDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.join(dbDir, "tracker.db");
  libsqlClient = createClient({
    url: `file:${dbPath.replace(/\\/g, "/")}`,
  });
}

/**
 * Normalizes SQL queries and parameter placeholders.
 * Postgres uses $1, $2, etc.
 * SQLite/LibSQL uses ?, ?, etc.
 */
function normalizeQuery(sql: string, toDialect: "postgres" | "sqlite"): string {
  if (toDialect === "sqlite") {
    // Replace $1, $2, ... with ?
    return sql.replace(/\$\d+/g, "?");
  } else {
    // If sql has ? placeholders, convert to $1, $2, ...
    let paramIndex = 1;
    return sql.replace(/\?/g, () => `$${paramIndex++}`);
  }
}

/**
 * Execute a query that returns rows (SELECT, RETURNING, etc.)
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  await ensureInitialized();

  if (isPostgres && pgPool) {
    const formattedSql = normalizeQuery(sql, "postgres");
    const result = await pgPool.query(formattedSql, params);
    return result.rows as T[];
  } else if (libsqlClient) {
    const formattedSql = normalizeQuery(sql, "sqlite");
    const result = await libsqlClient.execute({
      sql: formattedSql,
      args: params,
    });
    // Convert Libsql rows to plain objects
    return result.rows.map((row: any) => {
      const obj: Record<string, any> = {};
      result.columns.forEach((col: string) => {
        obj[col] = row[col];
      });
      return obj;
    }) as T[];
  }
  return [];
}

/**
 * Execute an INSERT, UPDATE, DELETE, or DDL statement
 */
export async function execute(sql: string, params: any[] = []): Promise<void> {
  await ensureInitialized();

  if (isPostgres && pgPool) {
    const formattedSql = normalizeQuery(sql, "postgres");
    await pgPool.query(formattedSql, params);
  } else if (libsqlClient) {
    const formattedSql = normalizeQuery(sql, "sqlite");
    await libsqlClient.execute({
      sql: formattedSql,
      args: params,
    });
  }
}

let isInitialized = false;
let initPromise: Promise<void> | null = null;

export async function ensureInitialized(): Promise<void> {
  if (isInitialized) return;
  if (!initPromise) {
    initPromise = runMigrations().then(() => {
      isInitialized = true;
    });
  }
  return initPromise;
}

async function runMigrations() {
  const ddlPostgres = `
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

    CREATE TABLE IF NOT EXISTS clicks (
      id VARCHAR(50) PRIMARY KEY,
      product_id VARCHAR(50),
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

    CREATE TABLE IF NOT EXISTS conversions (
      id VARCHAR(50) PRIMARY KEY,
      click_id VARCHAR(50),
      product_id VARCHAR(50),
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

    CREATE INDEX IF NOT EXISTS idx_clicks_created_at ON clicks(created_at);
    CREATE INDEX IF NOT EXISTS idx_clicks_product_campaign ON clicks(product_id, utm_campaign);
    CREATE INDEX IF NOT EXISTS idx_conversions_click_id ON conversions(click_id);
    CREATE INDEX IF NOT EXISTS idx_conversions_created_at ON conversions(created_at);
  `;

  const ddlSqlite = `
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      meta_pixel_id TEXT NOT NULL,
      meta_access_token TEXT NOT NULL,
      meta_test_event_code TEXT,
      webhook_secret TEXT,
      destination_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS clicks (
      id TEXT PRIMARY KEY,
      product_id TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      utm_content TEXT,
      utm_term TEXT,
      fbclid TEXT,
      fbc TEXT,
      fbp TEXT,
      client_ip TEXT,
      client_user_agent TEXT,
      page_url TEXT,
      referrer TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS conversions (
      id TEXT PRIMARY KEY,
      click_id TEXT,
      product_id TEXT,
      event_name TEXT NOT NULL,
      event_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      platform_order_id TEXT NOT NULL,
      order_amount REAL DEFAULT 0.00,
      currency TEXT DEFAULT 'BRL',
      order_status TEXT NOT NULL,
      customer_email_hash TEXT,
      customer_phone_hash TEXT,
      customer_name TEXT,
      capi_status TEXT DEFAULT 'pending',
      capi_response_code INTEGER,
      capi_error_message TEXT,
      raw_payload TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    if (isPostgres && pgPool) {
      await pgPool.query(ddlPostgres);
    } else if (libsqlClient) {
      const statements = ddlSqlite
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean);
      for (const stmt of statements) {
        await libsqlClient.execute(stmt);
      }
    }
  } catch (err) {
    console.error("Failed to initialize database tables:", err);
  }
}
