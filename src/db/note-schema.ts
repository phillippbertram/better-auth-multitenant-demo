import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organization, team, user } from "./auth-schema";

export const note = pgTable(
  "note",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    teamId: text("team_id").references(() => team.id, {
      onDelete: "set null",
    }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("note_organizationId_idx").on(table.organizationId),
    index("note_teamId_idx").on(table.teamId),
    index("note_authorId_idx").on(table.authorId),
  ],
);

export const noteRelations = relations(note, ({ one }) => ({
  organization: one(organization, {
    fields: [note.organizationId],
    references: [organization.id],
  }),
  team: one(team, {
    fields: [note.teamId],
    references: [team.id],
  }),
  author: one(user, {
    fields: [note.authorId],
    references: [user.id],
  }),
}));
