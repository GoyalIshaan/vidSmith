import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

export const videosTable = pgTable("videos", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  videoName: varchar({ length: 255 }).notNull(),
  fileName: varchar({ length: 255 }).notNull(),
  status: varchar({ length: 255 }).default("UPLOADING").notNull(),
  manifestUrl: varchar({ length: 2048 }).default(""),
  captionsUrl: varchar({ length: 2048 }).default(""),
  createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
});
