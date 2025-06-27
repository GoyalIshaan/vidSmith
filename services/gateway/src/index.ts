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

export const DB = drizzle(process.env.DATABASE_URL!);

// Import the programmatic API
import codegenMercurius, { gql as gqlTag } from "mercurius-codegen";

declare module "fastify" {
  interface FastifyInstance {
    uploadClient: UploadClient;
  }
}

// Extend MercuriusContext to include uploadClient
declare module "mercurius" {
  interface MercuriusContext {
    uploadClient: UploadClient;
    metadataClient: MetadataClient;
  }
}

const app = Fastify({ logger: true });

app.decorate("uploadClient", new UploadClient());

// 3) Load SDL (you can also embed via gqlTag)
const schema = readFileSync(path.join(__dirname, "schema.graphql"), "utf-8");

// 4) Register Mercurius
app.register(mercurius as any, {
  schema,
  resolvers,
  subscription: {
    // Mercurius's built-in PubSub is automatically available under ctx.pubsub
    onConnect: (connectionParams: any, socket: any, context: any) => {
      app.log.info("Subscription client connected");
    },
    onDisconnect: (socket: any, context: any) => {
      app.log.info("Subscription client disconnected");
    },
  },
  context: (req: any, reply: any) => {
    return {
      uploadClient: (app as any).uploadClient,
    };
  },
  graphiql: true,
  jit: 1,
});

// 5) Invoke programmatic codegen
//    - `targetPath`: relative or absolute path to where you want TS types
//    - `operationsGlob`: optional, for client-side queries
codegenMercurius(app, {
  targetPath: path.join(__dirname, "types", "graphql.ts"),
  // No need to specify operationsGlob unless you want TypedDocumentNodes
})
  .then(() => app.log.info("Generated types/graphql.ts"))
  .catch((err) => app.log.error("Codegen error:", err));

// 6) Start server
const start = async () => {
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
};

start();
