// Pure helpers for the My tasks screen (no React, unit tested directly).
import type { BadgeTone } from "../../shared/ui/Badge";
import type { MyTask, MyTaskEventStatus } from "./types";

export interface TaskEventGroup {
  event: MyTask["event"];
  organization: MyTask["organization"];
  tasks: MyTask[];
}

export interface TaskSummary {
  tasks: number;
  events: number;
  organizations: number;
}

export interface TaskEventDate {
  month: string;
  day: string;
  label: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startKey(event: MyTask["event"]): string {
  return `${event.date}T${(event.startTime || "00:00").slice(0, 5)}`;
}

/** One group per event, ordered by event date, start time, then event id; tasks keep the backend order. */
export function groupTasksByEvent(tasks: MyTask[]): TaskEventGroup[] {
  const groups = new Map<number, TaskEventGroup>();
  for (const task of tasks) {
    const group = groups.get(task.event.id);
    if (group) {
      group.tasks.push(task);
    } else {
      groups.set(task.event.id, { event: task.event, organization: task.organization, tasks: [task] });
    }
  }
  return [...groups.values()].sort(
    (a, b) => startKey(a.event).localeCompare(startKey(b.event)) || a.event.id - b.event.id,
  );
}

export function summarizeTasks(tasks: MyTask[]): TaskSummary {
  return {
    tasks: tasks.length,
    events: new Set(tasks.map((task) => task.event.id)).size,
    organizations: new Set(tasks.map((task) => task.organization.id)).size,
  };
}

/**
 * Reads the event's local date ("2026-11-14") and time ("18:00:00") as plain values,
 * so the displayed time is never shifted by the browser's timezone.
 */
export function formatTaskEventDate(date: string, startTime: string): TaskEventDate {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  const monthName = MONTHS[month - 1];
  const time = (startTime || "00:00").slice(0, 5);
  return {
    month: monthName.toUpperCase(),
    day: String(day).padStart(2, "0"),
    label: `${weekday}, ${day} ${monthName} · ${time}`,
  };
}

export function eventStatusBadge(status: MyTaskEventStatus): { label: string; tone: BadgeTone } {
  if (status === "PUBLISHED") return { label: "Published", tone: "Success" };
  if (status === "CANCELED") return { label: "Canceled", tone: "Danger" };
  return { label: "Draft", tone: "Warning" };
}
