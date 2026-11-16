// Pure helpers for the event Tasks tab (no React, unit tested directly).
import type { OrganizationMemberResponse } from "../../shared/api/types";
import type { OrganizationEvent } from "./types";

export interface EventTaskAssignee {
  id: number;
  firstName: string;
  lastName: string;
}

/** One item of GET /api/organizations/{organizationId}/events/{eventId}/tasks (backend EventTaskResponse). */
export interface EventTask {
  id: number;
  description: string;
  assignee: EventTaskAssignee | null;
}

export interface EventTaskRequest {
  description: string;
  assigneeUserId: number | null;
}

export type MemberRoleLabel = "Manager" | "Member";

/**
 * Tasks can change only while the event is neither canceled/completed nor ended. "Ended" is the backend
 * rule (T26): the event's date + end time (or start time when there is none) is not after now.
 */
export function canChangeTasks(
  event: Pick<OrganizationEvent, "status" | "date" | "startTime" | "endTime">,
  now: Date = new Date(),
): boolean {
  if (event.status === "CANCELED" || event.status === "COMPLETED") return false;
  // Without a readable date the end can't be known, so changes stay disabled (the backend decides anyway).
  if (typeof event.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(event.date)) return false;
  const time = (event.endTime || event.startTime || "00:00").slice(0, 5);
  const [year, month, day] = event.date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const end = new Date(year, month - 1, day, hours || 0, minutes || 0, 0, 0);
  return end.getTime() > now.getTime();
}

export function memberRoleLabel(
  members: OrganizationMemberResponse[] | undefined,
  userId: number,
): MemberRoleLabel | undefined {
  const role = members?.find((member) => member.id === userId)?.role;
  if (role === "MANAGER") return "Manager";
  if (role === "MEMBER") return "Member";
  return undefined;
}

export function toTaskRequest(description: string, assigneeValue: string): EventTaskRequest {
  return { description: description.trim(), assigneeUserId: assigneeValue ? Number(assigneeValue) : null };
}
