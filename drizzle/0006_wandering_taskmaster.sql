ALTER TABLE "note" ADD COLUMN "team_id" text;--> statement-breakpoint
ALTER TABLE "note" ADD CONSTRAINT "note_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "note_teamId_idx" ON "note" USING btree ("team_id");