// services/gateway/index.ts
import Fastify from "fastify";
import mercurius from "mercurius";
import cors from "@fastify/cors";
import { readFileSync } from "fs";
import path from "path";
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { UploadClient } from "./clients/uploadClient";
import { MetadataClient } from "./clients/metadataClient";
import { resolvers } from "./resolvers";
import codegenMercurius from "mercurius-codegen";
import { startConsuming } from "./messaging/consumer";

// Create PostgreSQL connection pool for Neon DB
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: {
    rejectUnauthorized: false, // Required for Neon DB
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased timeout
});

export const DB = drizzle(pool);

// Add error handling for database pool
pool.on("error", (err, client) => {
  console.error("Unexpected error on idle client", err);
  // Don't exit process, just log the error
});

// Test database connection on startup
async function testDatabaseConnection() {
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
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
    }
  }
  return false;
}

const app = Fastify({ logger: true });

// Add health check endpoint
app.get("/health", async (request, reply) => {
  try {
    // Test basic database connection
    await pool.query("SELECT 1");

    // Test if videos table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'videos'
      );
    `);

    const hasVideosTable = tableCheck.rows[0].exists;

    reply.send({
      status: "ok",
      database: "connected",
      videosTable: hasVideosTable ? "exists" : "missing",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    reply.code(503).send({
      status: "error",
      database: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

// Register CORS plugin
app.register(cors, {
  origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

app.decorate("uploadClient", new UploadClient());
app.decorate("metadataClient", new MetadataClient());

// Load the GraphQL schema from a separate schema file
const schema = readFileSync(path.join(__dirname, "schema.graphql"), "utf-8");

app.register(mercurius as any, {
  schema,
  resolvers,
  subscription: {
    onConnect: (connectionParams: any, socket: any, context: any) => {
      app.log.info("Subscription client connected");
    },
    onDisconnect: (socket: any, context: any) => {
      app.log.info("Subscription client disconnected");
    },
  },
  context: () => {
    return {
      uploadClient: app.uploadClient,
      metadataClient: app.metadataClient,
    };
  },
  graphiql: true,
  jit: 1,
});

// Generate types for the GraphQL schema
codegenMercurius(app, {
  targetPath: path.join(__dirname, "types", "graphql.ts"),
});

startConsuming();

async function start() {
  try {
    // Test database connection before starting server
    console.log("🔍 Testing database connection...");
    const dbConnected = await testDatabaseConnection();

    if (!dbConnected) {
      console.error("❌ Cannot start server without database connection");
      process.exit(1);
    }

    await app.listen({
      port: Number(process.env.PORT) || 3000,
      host: "0.0.0.0",
    });
    console.log(`🚀 GraphQL server ready at http://localhost:3000/graphiql`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
