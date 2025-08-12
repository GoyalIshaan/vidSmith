ALTER TABLE "videos" ADD COLUMN "transcodingFinished" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "captionsFinished" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "censorFinished" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "videos" DROP COLUMN "status";