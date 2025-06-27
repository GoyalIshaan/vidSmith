import { UploadClient } from "../clients/uploadClient";
import { MetadataClient } from "../clients/metadataClient";

// Extend FastifyInstance to include uploadClient & metadataClient
declare module "fastify" {
  interface FastifyInstance {
    uploadClient: UploadClient;
    metadataClient: MetadataClient;
  }
}
