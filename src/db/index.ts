import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.ts';
import * as dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ override: true });

// Ensure SSL connection options do not fail on self-signed certs in SSL chains (e.g., Supabase pooler)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Pool } = pg;

export const getDbConfig = () => {
  let connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;

  // Filter out any known invalid/deleted host if present in environment
  if (connectionString && connectionString.includes('ztvkdttdgsaviqiytafo')) {
    console.warn('[DB Config] Ignoring invalid/deleted host ztvkdttdgsaviqiytafo in connectionString');
    connectionString = undefined;
  }
  
  if (connectionString) {
    return {
      connectionString,
      ssl: connectionString.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 15000,
      max: 15,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    };
  }

  let host = process.env.SQL_HOST;
  const user = process.env.SQL_USER || 'ai_studio_app_user';
  const password = process.env.SQL_PASSWORD || 'HK\\],+{3H7?Hb$B0'; // Escaped the backslash
  const database = process.env.SQL_DB_NAME || 'cloud_sql_development_database';

  const standardCloudSqlDir = '/cloudsql';
  const appCloudSqlDir = '/app/cloudsql';

  // If host is provided but doesn't exist (e.g. copied from dev to prod), we should discover it
  if (host && host.startsWith('/') && !fs.existsSync(host)) {
    console.warn(`[DB Auto-Discover] Configured SQL_HOST ${host} does not exist. Falling back to auto-discovery.`);
    host = undefined;
  }

  if (!host) {
    
    try {
      if (fs.existsSync(standardCloudSqlDir)) {
        const dirs = fs.readdirSync(standardCloudSqlDir);
        const connectionDir = dirs.find(d => d.includes(':'));
        if (connectionDir) {
          host = `${standardCloudSqlDir}/${connectionDir}`;
          console.log(`[DB Auto-Discover] Found Cloud SQL socket in ${standardCloudSqlDir}: ${host}`);
        }
      }
    } catch (e) {
      console.warn('[DB Auto-Discover] Error checking /cloudsql:', e);
    }

    if (!host) {
      try {
        if (fs.existsSync(appCloudSqlDir)) {
          const dirs = fs.readdirSync(appCloudSqlDir);
          const connectionDir = dirs.find(d => d.includes(':'));
          if (connectionDir) {
            host = `${appCloudSqlDir}/${connectionDir}`;
            console.log(`[DB Auto-Discover] Found Cloud SQL socket in ${appCloudSqlDir}: ${host}`);
          }
        }
      } catch (e) {
        console.warn('[DB Auto-Discover] Error checking /app/cloudsql:', e);
      }
    }
  }

  // Final fallback
  if (!host) {
    throw new Error('Database connection configuration missing. Please set DATABASE_URL or SQL_HOST in environment variables.');
  }

  return {
    host,
    user,
    password,
    database,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 15000, 
    max: 15, 
    keepAlive: true, 
    keepAliveInitialDelayMillis: 10000,
  };
};

export const createPool = () => {
  return new Pool(getDbConfig());
};

const pool = createPool();

function enrichError(err: any): any {
  if (err && typeof err === 'object') {
    const cause = err.cause || err.originalError;
    if (cause) {
      const causeMsg = cause.message || String(cause);
      const enriched = new Error(`${err.message} | Cause: ${causeMsg}`);
      for (const key of Object.getOwnPropertyNames(err)) {
        if (key !== 'message') {
          try {
            (enriched as any)[key] = err[key];
          } catch (_) {}
        }
      }
      return enriched;
    }
  }
  return err;
}

// Monkey-patch Pool.query to automatically retry on transient database errors
const originalPoolQuery = pool.query;
pool.query = async function (this: any, ...args: any[]) {
  let lastErr: any;
  const retries = 10;
  for (let i = 0; i <= retries; i++) {
    try {
      // In pg, pool.query can be callback-based, but Drizzle and our code always use promise-based/async/await.
      // We safely apply the original query.
      return await originalPoolQuery.apply(this, args as any);
    } catch (err: any) {
      lastErr = err;
      const errMsg = String(err.message || err);
      const isTransient = errMsg.includes('Connection terminated') ||
                          errMsg.includes('unexpectedly') ||
                          errMsg.includes('terminated') ||
                          errMsg.includes('closed') ||
                          errMsg.includes('timeout') ||
                          errMsg.includes('socket') ||
                          errMsg.includes('Failed query') ||
                          errMsg.includes('query failed') ||
                          errMsg.includes('ECONNRESET');
      if (isTransient && i < retries) {
        const delay = Math.min(100 * Math.pow(1.8, i), 3000); // Exponential backoff up to 3 seconds max delay
        console.log(`[DB Pool Retry] Automatic reconnection check (attempt ${i + 1}/${retries + 1}) in ${Math.round(delay)}ms. Reason: socket refresh.`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw enrichError(err);
    }
  }
  throw enrichError(lastErr);
} as any;

function patchClient(client: any) {
  if (client && !client._patchedQuery) {
    client._patchedQuery = true;
    const originalClientQuery = client.query;
    client.query = async function (this: any, ...cArgs: any[]) {
      try {
        return await originalClientQuery.apply(this, cArgs as any);
      } catch (err: any) {
        throw enrichError(err);
      }
    } as any;
  }
}

// Monkey-patch Pool.connect to return a client whose query method is also patched, supporting callback and promise styles
const originalConnect = pool.connect;
pool.connect = function (this: any, ...args: any[]): any {
  if (typeof args[0] === 'function') {
    const originalCallback = args[0];
    args[0] = function (err: any, client: any, release: any) {
      if (client) {
        patchClient(client);
      }
      return originalCallback(err, client, release);
    };
    return originalConnect.apply(this, args as any);
  } else {
    const promise = originalConnect.apply(this, args as any);
    if (promise && typeof promise.then === 'function') {
      return promise.then((client: any) => {
        if (client) {
          patchClient(client);
        }
        return client;
      });
    }
    return promise;
  }
} as any;

pool.on('error', (err) => {
  console.error('Unexpected error on idle SQL pool client:', err);
});

export const db = drizzle(pool, { schema });

// Helper to execute database queries with automatic retry on transient connection drops
export async function queryWithRetry<T>(queryFn: () => Promise<T>, retries = 10, delay = 100): Promise<T> {
  let lastErr: any;
  for (let i = 0; i <= retries; i++) {
    try {
      return await queryFn();
    } catch (err: any) {
      lastErr = err;
      const errMsg = String(err.message || err);
      const isTransient = errMsg.includes('Connection terminated') ||
                          errMsg.includes('unexpectedly') ||
                          errMsg.includes('terminated') ||
                          errMsg.includes('closed') ||
                          errMsg.includes('timeout') ||
                          errMsg.includes('socket') ||
                          errMsg.includes('Failed query') ||
                          errMsg.includes('query failed') ||
                          errMsg.includes('ECONNRESET');
      if (isTransient && i < retries) {
        const currentDelay = Math.min(delay * Math.pow(1.8, i), 3000);
        console.log(`[DB Retry] Automatic recovery retry (attempt ${i + 1}/${retries + 1}) in ${Math.round(currentDelay)}ms.`);
        await new Promise((resolve) => setTimeout(resolve, currentDelay));
        continue;
      }
      throw enrichError(err);
    }
  }
  throw enrichError(lastErr);
}
