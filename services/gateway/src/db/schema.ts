import {
  pgTable,
  varchar,
  timestamp,
  uuid,
  boolean,
  integer,
} from "drizzle-orm/pg-core";

export const videosTable = pgTable("videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  videoName: varchar({ length: 255 }).notNull(),
  s3Key: varchar({ length: 255 }).notNull(),
  status: integer().notNull().default(0),
  bucketName: varchar({ length: 255 }).$type<string>().default(""),
  captionsKey: varchar({ length: 255 }).$type<string>().default(""),
  manifestKey: varchar({ length: 255 }).$type<string>().default(""),
  censor: boolean("censor").default(false),
  createdAt: timestamp().notNull().defaultNow().$type<Date>(),
  updatedAt: timestamp().notNull().defaultNow().$type<Date>(),
});
