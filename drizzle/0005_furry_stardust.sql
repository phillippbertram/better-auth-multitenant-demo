CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"team_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"inviter_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"created_at" timestamp NOT NULL,
	"metadata" text,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "organization_role" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"role" text NOT NULL,
	"permission" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "team" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"member_count" integer DEFAULT 0 NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "team_member" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"user_id" text NOT NULL,
	"membership_key" text,
	"created_at" timestamp,
	CONSTRAINT "team_member_membership_key_unique" UNIQUE("membership_key")
);
--> statement-breakpoint
ALTER TABLE "note" RENAME COLUMN "user_id" TO "author_id";--> statement-breakpoint
ALTER TABLE "note" DROP CONSTRAINT "note_user_id_user_id_fk";
--> statement-breakpoint
DROP INDEX "note_userId_idx";--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "active_organization_id" text;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "active_team_id" text;--> statement-breakpoint
ALTER TABLE "note" ADD COLUMN "organization_id" text;--> statement-breakpoint
DELETE FROM "note" WHERE "id" LIKE 'demo-note-%';--> statement-breakpoint
INSERT INTO "organization" ("id", "name", "slug", "created_at", "metadata")
SELECT
	'import-org-' || md5("user"."id"),
	"user"."name" || '''s imported notes',
	'imported-' || md5("user"."id"),
	now(),
	'{"source":"note-migration"}'
FROM "user"
WHERE EXISTS (
	SELECT 1 FROM "note" WHERE "note"."author_id" = "user"."id"
)
ON CONFLICT ("slug") DO NOTHING;--> statement-breakpoint
INSERT INTO "member" ("id", "organization_id", "user_id", "role", "created_at")
SELECT
	'import-member-' || md5("user"."id"),
	'import-org-' || md5("user"."id"),
	"user"."id",
	'owner',
	now()
FROM "user"
WHERE EXISTS (
	SELECT 1 FROM "note" WHERE "note"."author_id" = "user"."id"
)
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
INSERT INTO "team" ("id", "name", "member_count", "organization_id", "created_at")
SELECT
	'import-team-' || md5("user"."id"),
	'Imported notes',
	1,
	'import-org-' || md5("user"."id"),
	now()
FROM "user"
WHERE EXISTS (
	SELECT 1 FROM "note" WHERE "note"."author_id" = "user"."id"
)
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
INSERT INTO "team_member" ("id", "team_id", "user_id", "membership_key", "created_at")
SELECT
	'import-team-member-' || md5("user"."id"),
	'import-team-' || md5("user"."id"),
	"user"."id",
	'import-team-' || md5("user"."id") || ':' || "user"."id",
	now()
FROM "user"
WHERE EXISTS (
	SELECT 1 FROM "note" WHERE "note"."author_id" = "user"."id"
)
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
UPDATE "note"
SET "organization_id" = 'import-org-' || md5("note"."author_id")
WHERE "organization_id" IS NULL;--> statement-breakpoint
ALTER TABLE "note" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_role" ADD CONSTRAINT "organization_role_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invitation_organizationId_idx" ON "invitation" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" USING btree ("email");--> statement-breakpoint
CREATE INDEX "member_organizationId_idx" ON "member" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "member_userId_idx" ON "member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "organizationRole_organizationId_idx" ON "organization_role" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organizationRole_role_idx" ON "organization_role" USING btree ("role");--> statement-breakpoint
CREATE INDEX "team_organizationId_idx" ON "team" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "teamMember_teamId_idx" ON "team_member" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "teamMember_userId_idx" ON "team_member" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "note" ADD CONSTRAINT "note_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note" ADD CONSTRAINT "note_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "note_organizationId_idx" ON "note" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "note_authorId_idx" ON "note" USING btree ("author_id");
