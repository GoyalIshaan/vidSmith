// services/gateway/index.ts
import Fastify from "fastify";
import mercurius from "mercurius";
import cors from "@fastify/cors";
import { readFileSync } from "fs";
import path from "path";
import "dotenv/config";
import { UploadClient } from "./clients/uploadClient";
import { MetadataClient } from "./clients/metadataClient";
import { resolvers } from "./resolvers";
import codegenMercurius from "mercurius-codegen";
import { startConsuming } from "./messaging/consumer";
import { testDatabaseConnection } from "./db/dbSetup";
import { healthCheckPlugin } from "./health/healthCheck";

const app = Fastify({ logger: true });

app.register(healthCheckPlugin);

// Parse allowed origins from environment variable
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : ["http://localhost:5173", "http://127.0.0.1:5173"];

app.register(cors, {
  origin: allowedOrigins,
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
