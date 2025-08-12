import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: {
    rejectUnauthorized: true,
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // Add more robust connection settings
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  allowExitOnIdle: false,
});

export const DB = drizzle(pool);

pool.on("error", (err, client) => {
  console.error("Unexpected error on idle client", err);
  // Don't exit the process, let it recover
});

pool.on("connect", (client) => {
  console.log("New client connected to database");
});

pool.on("remove", (client) => {
  console.log("Client removed from pool");
});

// Add a wrapper function for database operations with retry logic
export async function withDBRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.error(
        `Database operation failed (attempt ${attempt}/${maxRetries}):`,
        error
      );

      if (attempt === maxRetries) {
        throw lastError;
      }

      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

export async function testDatabaseConnection() {
  let retries = 5;
  while (retries > 0) {
    try {
      const client = await pool.connect();
      await client.query("SELECT 1");
      client.release();
      console.log("✅ Database connection successful");
      return true;
    } catch (error) {
      console.error(
        `❌ Database connection failed (attempt ${6 - retries}/5):`,
        error
      );
      retries--;
      if (retries === 0) {
        console.error("❌ Failed to connect to database after 5 attempts");
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  return false;
}
