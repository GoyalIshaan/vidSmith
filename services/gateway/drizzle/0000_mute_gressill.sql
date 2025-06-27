CREATE TABLE "videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"videoName" varchar(255) NOT NULL,
	"filename" varchar(255) NOT NULL,
	"status" varchar(255) DEFAULT 'UPLOADING' NOT NULL,
	"manifestUrl" varchar(2048) DEFAULT '',
	"captionsUrl" varchar(2048) DEFAULT '',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
