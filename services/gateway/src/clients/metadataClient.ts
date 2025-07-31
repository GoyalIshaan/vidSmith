import { DB } from "../db/dbSetup";
import { videosTable } from "../db/schema";
import { eq } from "drizzle-orm";

export class MetadataClient {
  async getVideo(id: string) {
    const video = await DB.select()
      .from(videosTable)
      .where(eq(videosTable.id, id));

    return video[0];
  }

  async getAllVideos() {
    const videos = await DB.select().from(videosTable);
    return videos;
  }
}
