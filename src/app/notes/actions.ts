"use server";

import { db } from "@/db";
import { organization, team, teamMember, user } from "@/db/auth-schema";
import { note } from "@/db/note-schema";
import { canAssignNoteTeam, canMutateNote } from "@/lib/note-policy";
import {
  getNotePermissions,
  hasOrganizationPermission,
  requireOrganizationSession,
} from "@/lib/organization-session";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type NoteActionState = {
  error?: string;
  success?: boolean;
};

const noteInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(120),
  content: z.string().trim().min(1, "Content is required.").max(5000),
  teamId: z.string().trim().nullable(),
});

function getRequestedTeamId(formData: FormData) {
  const value = formData.get("teamId");

  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value === "__organization_wide__"
  ) {
    return null;
  }

  return value;
}

async function getTeamInOrganization(
  teamId: string | null,
  organizationId: string,
) {
  if (!teamId) return null;

  const [target] = await db
    .select({ id: team.id, name: team.name, organizationId: team.organizationId })
    .from(team)
    .where(and(eq(team.id, teamId), eq(team.organizationId, organizationId)))
    .limit(1);

  return target;
}

async function getActiveNoteTeam(input: {
  activeTeamId: string | null;
  organizationId: string;
  userId: string;
}) {
  if (!input.activeTeamId) return null;

  const [activeTeam] = await db
    .select({ id: team.id, name: team.name })
    .from(teamMember)
    .innerJoin(team, eq(team.id, teamMember.teamId))
    .where(
      and(
        eq(team.id, input.activeTeamId),
        eq(team.organizationId, input.organizationId),
        eq(teamMember.userId, input.userId),
      ),
    )
    .limit(1);

  return activeTeam ?? null;
}

async function getNoteTarget(noteId: string, organizationId: string) {
  const [target] = await db
    .select({ id: note.id, authorId: note.authorId })
    .from(note)
    .where(
      and(eq(note.id, noteId), eq(note.organizationId, organizationId)),
    )
    .limit(1);

  return target;
}

export async function getNotesForCurrentOrganization() {
  const context = await requireOrganizationSession();
  const permissions = await getNotePermissions(
    context.organizationId,
    context.requestHeaders,
  );

  if (!permissions.read) {
    throw new Error("You are not allowed to read organization notes.");
  }

  const activeTeam = await getActiveNoteTeam({
    activeTeamId: context.session.session.activeTeamId ?? null,
    organizationId: context.organizationId,
    userId: context.session.user.id,
  });

  const [notes, organizationTeams] = await Promise.all([
    db
      .select({
        id: note.id,
        title: note.title,
        content: note.content,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        organizationId: organization.id,
        organizationName: organization.name,
        teamId: team.id,
        teamName: team.name,
        authorId: user.id,
        authorName: user.name,
        authorEmail: user.email,
      })
      .from(note)
      .innerJoin(organization, eq(organization.id, note.organizationId))
      .innerJoin(user, eq(user.id, note.authorId))
      .leftJoin(team, eq(team.id, note.teamId))
      .where(
        activeTeam
          ? and(
              eq(note.organizationId, context.organizationId),
              eq(note.teamId, activeTeam.id),
            )
          : eq(note.organizationId, context.organizationId),
      )
      .orderBy(desc(note.updatedAt)),
    db
      .select({ id: team.id, name: team.name })
      .from(team)
      .where(eq(team.organizationId, context.organizationId))
      .orderBy(team.name),
  ]);

  return {
    canCreate: permissions.create,
    activeTeam,
    teams: organizationTeams,
    organization: {
      id: context.organizationId,
      name: context.membership.organizationName,
      slug: context.membership.organizationSlug,
    },
    notes: notes.map((item) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      organization: {
        id: item.organizationId,
        name: item.organizationName,
      },
      team: item.teamId
        ? { id: item.teamId, name: item.teamName ?? "Unknown team" }
        : null,
      author: {
        id: item.authorId,
        name: item.authorName,
        email: item.authorEmail,
      },
      canEdit: canMutateNote({
        action: "update",
        isAuthor: item.authorId === context.session.user.id,
        permissions,
      }),
      canDelete: canMutateNote({
        action: "delete",
        isAuthor: item.authorId === context.session.user.id,
        permissions,
      }),
    })),
  };
}

export async function createNote(
  _prevState: NoteActionState,
  formData: FormData,
): Promise<NoteActionState> {
  try {
    const context = await requireOrganizationSession();
    const allowed = await hasOrganizationPermission(
      context.organizationId,
      "note",
      "create",
      context.requestHeaders,
    );
    const parsed = noteInputSchema.safeParse({
      title: formData.get("title"),
      content: formData.get("content"),
      teamId: getRequestedTeamId(formData),
    });

    if (!allowed) {
      return { error: "You are not allowed to create notes." };
    }

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid note." };
    }

    const targetTeam = await getTeamInOrganization(
      parsed.data.teamId,
      context.organizationId,
    );

    if (
      parsed.data.teamId &&
      (!targetTeam ||
        !canAssignNoteTeam({
          organizationId: context.organizationId,
          teamOrganizationId: targetTeam.organizationId,
        }))
    ) {
      return { error: "Team not found in the active organization." };
    }

    await db.insert(note).values({
      id: crypto.randomUUID(),
      title: parsed.data.title,
      content: parsed.data.content,
      organizationId: context.organizationId,
      teamId: targetTeam?.id ?? null,
      authorId: context.session.user.id,
    });

    revalidatePath("/notes");
    return { success: true };
  } catch {
    return { error: "Could not create note." };
  }
}

export async function updateNote(
  noteId: string,
  _prevState: NoteActionState,
  formData: FormData,
): Promise<NoteActionState> {
  try {
    const context = await requireOrganizationSession();
    const permissions = await getNotePermissions(
      context.organizationId,
      context.requestHeaders,
    );
    const parsed = noteInputSchema.safeParse({
      title: formData.get("title"),
      content: formData.get("content"),
      teamId: getRequestedTeamId(formData),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid note." };
    }

    const target = await getNoteTarget(noteId, context.organizationId);

    if (!target) {
      return { error: "Note not found in the active organization." };
    }

    if (
      !canMutateNote({
        action: "update",
        isAuthor: target.authorId === context.session.user.id,
        permissions,
      })
    ) {
      return { error: "You are not allowed to edit this note." };
    }

    const targetTeam = await getTeamInOrganization(
      parsed.data.teamId,
      context.organizationId,
    );

    if (
      parsed.data.teamId &&
      (!targetTeam ||
        !canAssignNoteTeam({
          organizationId: context.organizationId,
          teamOrganizationId: targetTeam.organizationId,
        }))
    ) {
      return { error: "Team not found in the active organization." };
    }

    await db
      .update(note)
      .set({
        title: parsed.data.title,
        content: parsed.data.content,
        teamId: targetTeam?.id ?? null,
      })
      .where(
        and(
          eq(note.id, target.id),
          eq(note.organizationId, context.organizationId),
        ),
      );

    revalidatePath("/notes");
    return { success: true };
  } catch {
    return { error: "Could not update note." };
  }
}

export async function deleteNote(noteId: string): Promise<NoteActionState> {
  try {
    const context = await requireOrganizationSession();
    const permissions = await getNotePermissions(
      context.organizationId,
      context.requestHeaders,
    );
    const target = await getNoteTarget(noteId, context.organizationId);

    if (!target) {
      return { error: "Note not found in the active organization." };
    }

    if (
      !canMutateNote({
        action: "delete",
        isAuthor: target.authorId === context.session.user.id,
        permissions,
      })
    ) {
      return { error: "You are not allowed to delete this note." };
    }

    await db
      .delete(note)
      .where(
        and(
          eq(note.id, target.id),
          eq(note.organizationId, context.organizationId),
        ),
      );

    revalidatePath("/notes");
    return { success: true };
  } catch {
    return { error: "Could not delete note." };
  }
}
