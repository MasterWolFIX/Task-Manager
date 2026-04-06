ALTER TABLE "submissions" ADD COLUMN "status" varchar(20) DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "canEdit" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "submission_type" varchar(20) DEFAULT 'both' NOT NULL;