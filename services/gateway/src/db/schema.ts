import {
  pgTable,
  varchar,
  timestamp,
  uuid,
  boolean,
  integer,
  real,
} from "drizzle-orm/pg-core";

export const videosTable = pgTable("videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  videoName: varchar({ length: 255 }).notNull(),
  s3Key: varchar({ length: 255 }).notNull(),
  bucketName: varchar({ length: 255 }).$type<string>().default(""),
  captionsKey: varchar({ length: 255 }).$type<string>().default(""),
  manifestKey: varchar({ length: 255 }).$type<string>().default(""),
  thumbnailKey: varchar({ length: 255 }).$type<string>().default(""),
  videoDuration: real("videoDuration").$type<number>().default(0),
  censor: boolean("censor").default(false),
  transcodingFinished: boolean("transcodingFinished").default(false),
  captionsFinished: boolean("captionsFinished").default(false),
  censorFinished: boolean("censorFinished").default(false),
  createdAt: timestamp().notNull().defaultNow().$type<Date>(),
  updatedAt: timestamp().notNull().defaultNow().$type<Date>(),
});
