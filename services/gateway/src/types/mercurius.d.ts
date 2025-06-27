import { UploadClient } from "../clients/uploadClient";
import { MetadataClient } from "../clients/metadataClient";

// Extend MercuriusContext to include uploadClient & metadataClient
declare module "mercurius" {
  interface MercuriusContext {
    uploadClient: UploadClient;
    metadataClient: MetadataClient;
  }
}
