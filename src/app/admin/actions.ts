"use server";

import { db } from "@/db";
import { member, organization, team, user } from "@/db/auth-schema";
import { note } from "@/db/note-schema";
import { auth } from "@/lib/auth";
import { requireAdminSessionForAction } from "@/lib/admin";
import { canAssignNoteTeam } from "@/lib/note-policy";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

export type AdminActionState = {
  error?: string;
  success?: boolean;
};

const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  email: z.email("Please enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: z.enum(["user", "admin"]),
});

const setRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["user", "admin"]),
});

const userIdSchema = z.object({
  userId: z.string().min(1),
});

const banUserSchema = z.object({
  userId: z.string().min(1),
  banReason: z.string().trim().min(1, "Ban reason is required.").max(500),
});

const noteInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(120),
  content: z.string().trim().min(1, "Content is required.").max(5000),
  organizationId: z.string().min(1, "Please select an organization."),
  teamId: z.string().trim().nullable(),
});

const adminNoteTargetSchema = z.object({
  userId: z.string().min(1),
  noteId: z.string().min(1),
});

function revalidateUserNotes(userId: string) {
  revalidatePath("/notes");
  revalidatePath(`/admin/users/${userId}`);
}

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
    .select({ id: team.id, organizationId: team.organizationId })
    .from(team)
    .where(and(eq(team.id, teamId), eq(team.organizationId, organizationId)))
    .limit(1);

  return target;
}

export async function getNotesForUser(userId: string) {
  await requireAdminSessionForAction();
  const parsed = userIdSchema.safeParse({ userId });

  if (!parsed.success) {
    return [];
  }

  return db
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
    .where(eq(note.authorId, parsed.data.userId))
    .orderBy(desc(note.updatedAt))
    .then((notes) =>
      notes.map((item) => ({
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
        canEdit: true,
        canDelete: true,
      })),
    );
}

export async function getOrganizationsForUser(userId: string) {
  await requireAdminSessionForAction();
  const parsed = userIdSchema.safeParse({ userId });

  if (!parsed.success) {
    return [];
  }

  const organizations = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      role: member.role,
    })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(eq(member.userId, parsed.data.userId))
    .orderBy(organization.name);

  if (organizations.length === 0) {
    return [];
  }

  const organizationTeams = await db
    .select({ id: team.id, name: team.name, organizationId: team.organizationId })
    .from(team)
    .where(inArray(team.organizationId, organizations.map((item) => item.id)))
    .orderBy(asc(team.name));

  return organizations.map((item) => ({
    ...item,
    teams: organizationTeams
      .filter((teamItem) => teamItem.organizationId === item.id)
      .map(({ id, name }) => ({ id, name })),
  }));
}

export async function createNoteForUser(
  userId: string,
  _prevState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    await requireAdminSessionForAction();
    const target = userIdSchema.safeParse({ userId });
    const input = noteInputSchema.safeParse({
      title: formData.get("title"),
      content: formData.get("content"),
      organizationId: formData.get("organizationId"),
      teamId: getRequestedTeamId(formData),
    });

    if (!target.success) {
      return { error: "Invalid user." };
    }

    if (!input.success) {
      return {
        error: input.error.issues[0]?.message ?? "Invalid note.",
      };
    }

    const [membership] = await db
      .select({ id: member.id })
      .from(member)
      .where(
        and(
          eq(member.userId, target.data.userId),
          eq(member.organizationId, input.data.organizationId),
        ),
      )
      .limit(1);

    if (!membership) {
      return { error: "The user is not a member of this organization." };
    }

    const targetTeam = await getTeamInOrganization(
      input.data.teamId,
      input.data.organizationId,
    );

    if (
      input.data.teamId &&
      (!targetTeam ||
        !canAssignNoteTeam({
          organizationId: input.data.organizationId,
          teamOrganizationId: targetTeam.organizationId,
        }))
    ) {
      return { error: "Team not found in the selected organization." };
    }

    await db.insert(note).values({
      id: crypto.randomUUID(),
      title: input.data.title,
      content: input.data.content,
      organizationId: input.data.organizationId,
      teamId: targetTeam?.id ?? null,
      authorId: target.data.userId,
    });

    revalidateUserNotes(target.data.userId);
    return { success: true };
  } catch {
    return { error: "Could not create note for this user." };
  }
}

export async function updateNoteForUser(
  userId: string,
  noteId: string,
  _prevState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    await requireAdminSessionForAction();
    const target = adminNoteTargetSchema.safeParse({ userId, noteId });
    const input = noteInputSchema.safeParse({
      title: formData.get("title"),
      content: formData.get("content"),
      organizationId: formData.get("organizationId"),
      teamId: getRequestedTeamId(formData),
    });

    if (!target.success) {
      return { error: "Invalid note." };
    }

    if (!input.success) {
      return {
        error: input.error.issues[0]?.message ?? "Invalid note.",
      };
    }

    const targetTeam = await getTeamInOrganization(
      input.data.teamId,
      input.data.organizationId,
    );

    if (
      input.data.teamId &&
      (!targetTeam ||
        !canAssignNoteTeam({
          organizationId: input.data.organizationId,
          teamOrganizationId: targetTeam.organizationId,
        }))
    ) {
      return { error: "Team not found in the selected organization." };
    }

    const updated = await db
      .update(note)
      .set({
        title: input.data.title,
        content: input.data.content,
        teamId: targetTeam?.id ?? null,
      })
      .where(
        and(
          eq(note.id, target.data.noteId),
          eq(note.authorId, target.data.userId),
          eq(note.organizationId, input.data.organizationId),
        ),
      )
      .returning({ id: note.id });

    if (updated.length === 0) {
      return { error: "Note not found for this user." };
    }

    revalidateUserNotes(target.data.userId);
    return { success: true };
  } catch {
    return { error: "Could not update this user's note." };
  }
}

export async function deleteNoteForUser(
  userId: string,
  noteId: string,
): Promise<AdminActionState> {
  try {
    await requireAdminSessionForAction();
    const target = adminNoteTargetSchema.safeParse({ userId, noteId });

    if (!target.success) {
      return { error: "Invalid note." };
    }

    const deleted = await db
      .delete(note)
      .where(
        and(
          eq(note.id, target.data.noteId),
          eq(note.authorId, target.data.userId),
        ),
      )
      .returning({ id: note.id });

    if (deleted.length === 0) {
      return { error: "Note not found for this user." };
    }

    revalidateUserNotes(target.data.userId);
    return { success: true };
  } catch {
    return { error: "Could not delete this user's note." };
  }
}

export async function createAdminUser(
  _prevState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    await requireAdminSessionForAction();
    const parsed = createUserSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      role: formData.get("role"),
    });

    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Invalid user data.",
      };
    }

    await auth.api.createUser({
      body: parsed.data,
      headers: await headers(),
    });

    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { error: "Could not create user." };
  }
}

export async function setUserRole(
  userId: string,
  role: "user" | "admin",
): Promise<AdminActionState> {
  try {
    const session = await requireAdminSessionForAction();
    const parsed = setRoleSchema.safeParse({ userId, role });

    if (!parsed.success) {
      return { error: "Invalid role update." };
    }

    if (session.user.id === parsed.data.userId && parsed.data.role !== "admin") {
      return { error: "You cannot remove your own admin role." };
    }

    await auth.api.setRole({
      body: parsed.data,
      headers: await headers(),
    });

    revalidatePath("/admin");
    revalidatePath(`/admin/users/${userId}`);
    return { success: true };
  } catch {
    return { error: "Could not update role." };
  }
}

export async function banUser(
  userId: string,
  banReason: string,
): Promise<AdminActionState> {
  try {
    const session = await requireAdminSessionForAction();
    const parsed = banUserSchema.safeParse({ userId, banReason });

    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Invalid ban request.",
      };
    }

    if (session.user.id === parsed.data.userId) {
      return { error: "You cannot ban your own account." };
    }

    await auth.api.banUser({
      body: parsed.data,
      headers: await headers(),
    });

    revalidatePath("/admin");
    revalidatePath(`/admin/users/${userId}`);
    return { success: true };
  } catch {
    return { error: "Could not ban user." };
  }
}

export async function unbanUser(userId: string): Promise<AdminActionState> {
  try {
    await requireAdminSessionForAction();
    const parsed = userIdSchema.safeParse({ userId });

    if (!parsed.success) {
      return { error: "Invalid user." };
    }

    await auth.api.unbanUser({
      body: parsed.data,
      headers: await headers(),
    });

    revalidatePath("/admin");
    revalidatePath(`/admin/users/${userId}`);
    return { success: true };
  } catch {
    return { error: "Could not unban user." };
  }
}

export async function removeUser(userId: string): Promise<AdminActionState> {
  try {
    const session = await requireAdminSessionForAction();
    const parsed = userIdSchema.safeParse({ userId });

    if (!parsed.success) {
      return { error: "Invalid user." };
    }

    if (session.user.id === parsed.data.userId) {
      return { error: "You cannot delete your own account." };
    }

    await auth.api.removeUser({
      body: parsed.data,
      headers: await headers(),
    });

    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { error: "Could not delete user." };
  }
}
