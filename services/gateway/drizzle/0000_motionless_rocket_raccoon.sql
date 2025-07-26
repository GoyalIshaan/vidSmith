CREATE TABLE "videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"videoName" varchar(255) NOT NULL,
	"s3Key" varchar(255) NOT NULL,
	"status" integer DEFAULT 0 NOT NULL,
	"bucketName" varchar(255) DEFAULT '',
	"captionsKey" varchar(255) DEFAULT '',
	"manifestKey" varchar(255) DEFAULT '',
	"censor" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
