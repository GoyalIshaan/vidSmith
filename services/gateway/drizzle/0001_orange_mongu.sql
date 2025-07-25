ALTER TABLE "videos" ADD COLUMN "manifestKey" varchar(255) DEFAULT '';
ALTER TABLE "videos" ADD COLUMN "censor" boolean DEFAULT false;