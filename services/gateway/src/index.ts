// services/gateway/index.ts
import Fastify from "fastify";
import mercurius from "mercurius";
import { readFileSync } from "fs";
import path from "path";
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { UploadClient } from "./clients/uploadClient";
import { MetadataClient } from "./clients/metadataClient";
import { resolvers } from "./resolvers";
import codegenMercurius from "mercurius-codegen";
import "./types/mercurius";
import "./types/fastify";

export const DB = drizzle(process.env.DATABASE_URL!);

const app = Fastify({ logger: true });

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

async function start() {
  try {
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
