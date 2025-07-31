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
});

export const DB = drizzle(pool);

pool.on("error", (err, client) => {
  console.error("Unexpected error on idle client", err);
});

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
