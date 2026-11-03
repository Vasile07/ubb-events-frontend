import type { BadgeTone } from "../ui/Badge";

export type EventLifecycleStatus = "OPEN" | "COMPLETED" | "CANCELED";
export type RegistrationStatus = "NONE" | "REGISTERED";

export type EventStatusInput = {
  status: EventLifecycleStatus;
  capacity: number;
  spotsTaken: number;
};

export type EventBadge = { label: string; tone: BadgeTone };

export function getEventBadge(
  event: EventStatusInput,
  registrationStatus: RegistrationStatus = "NONE",
): EventBadge {
  if (event.status === "CANCELED") return { label: "Canceled", tone: "Danger" };
  if (registrationStatus === "REGISTERED") return { label: "Registered", tone: "Info" };
  if (event.status === "COMPLETED") return { label: "Completed", tone: "Info" };

  const capacity = Math.max(0, event.capacity);
  const remaining = Math.max(0, capacity - Math.max(0, event.spotsTaken));
  const fewSpots = remaining <= 5 || (capacity > 0 && remaining / capacity <= 0.1);
  if (capacity === 0 || remaining === 0) return { label: "Full", tone: "Danger" };
  if (fewSpots) return { label: "Few spots left", tone: "Warning" };
  return { label: "Open", tone: "Success" };
}
