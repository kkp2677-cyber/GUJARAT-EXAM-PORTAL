import pg from 'pg';
import { getDbConfig } from '../src/db/index.ts';

const { Pool } = pg;

async function runMigrationForDb(databaseName: string) {
  const baseConfig = getDbConfig();
  
  // Prepare configuration for this specific database
  // If SQL_ADMIN_USER is available, we prioritize it as requested, falling back to the standard user
  const user = process.env.SQL_ADMIN_USER || baseConfig.user;
  const password = process.env.SQL_ADMIN_PASSWORD || baseConfig.password;

  console.log(`\n==================================================`);
  console.log(`Starting migration for database: "${databaseName}"`);
  console.log(`Using user: "${user}"`);
  console.log(`Connecting via host: "${baseConfig.host}"`);
  
  const poolConfig = {
    host: baseConfig.host,
    user: user,
    password: password,
    database: databaseName,
    connectionTimeoutMillis: 10000,
  };

  const pool = new Pool(poolConfig);

  try {
    // 1. Check if the posts table exists
    const tableCheckQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'posts'
      );
    `;
    const checkResult = await pool.query(tableCheckQuery);
    const tableExists = checkResult.rows[0]?.exists;

    if (!tableExists) {
      console.log(`[info] Table "posts" does not exist in "${databaseName}". Skipping.`);
      await pool.end();
      return;
    }

    console.log(`[info] Table "posts" exists. Checking column structure...`);

    // 2. Check if updated_at column exists
    const columnCheckQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'posts' AND column_name = 'updated_at';
    `;
    const colCheckResult = await pool.query(columnCheckQuery);
    
    if (colCheckResult.rows.length > 0) {
      console.log(`[success] Column "updated_at" already exists in table "posts" for "${databaseName}". No alteration needed.`);
    } else {
      console.log(`[action] Column "updated_at" is missing. Executing ALTER TABLE query...`);
      
      const alterQuery = `
        ALTER TABLE posts 
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
      `;
      await pool.query(alterQuery);
      console.log(`[success] Successfully added "updated_at" column to "posts" table in "${databaseName}"!`);
    }

    // 3. Verify final schema of posts table
    const finalCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'posts';
    `);
    console.log(`[schema] Current columns in "posts" table:`);
    finalCheck.rows.forEach(row => {
      console.log(` - ${row.column_name}: ${row.data_type}`);
    });

  } catch (error: any) {
    console.error(`[error] Migration failed for database "${databaseName}":`, error.message);
  } finally {
    await pool.end();
  }
}

async function main() {
  // Let's run for both cloud_sql_production_database and the configured SQL_DB_NAME
  const configuredDbName = process.env.SQL_DB_NAME || 'cloud_sql_development_database';
  
  const dbsToMigrate = new Set<string>();
  dbsToMigrate.add('cloud_sql_production_database');
  dbsToMigrate.add('cloud_sql_development_database');
  if (configuredDbName) {
    dbsToMigrate.add(configuredDbName);
  }

  for (const dbName of dbsToMigrate) {
    await runMigrationForDb(dbName);
  }
  
  console.log(`\n==================================================`);
  console.log(`Migration execution completed.`);
}

main().catch(err => {
  console.error("Migration execution failed with error:", err);
  process.exit(1);
});
