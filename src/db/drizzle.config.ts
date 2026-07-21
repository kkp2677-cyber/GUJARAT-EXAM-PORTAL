import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL;

const dbCredentials = connectionString 
  ? { url: connectionString, ssl: connectionString.includes('sslmode=disable') ? false : { rejectUnauthorized: false } }
  : {
      host: process.env.SQL_HOST || "",
      user: process.env.SQL_USER || "",
      password: process.env.SQL_PASSWORD || "",
      database: process.env.SQL_DB_NAME || "",
      ssl: false,
    };

if (!connectionString) {
  if (!process.env.SQL_HOST) {
    throw new Error("SQL_HOST or POSTGRES_URL must be set in environment variables.");
  }
  if (!process.env.SQL_DB_NAME) {
    throw new Error("SQL_DB_NAME or POSTGRES_URL must be set in environment variables.");
  }
  if (!process.env.SQL_USER) {
    throw new Error("SQL_USER or POSTGRES_URL must be set in environment variables.");
  }
  if (!process.env.SQL_PASSWORD) {
    throw new Error("SQL_PASSWORD or POSTGRES_URL must be set in environment variables.");
  }
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials,
  verbose: true,
});
