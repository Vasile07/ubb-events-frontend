export type DiscoveryEventStatus = "PUBLISHED" | "COMPLETED" | "CANCELED";

export interface EventSummary {
  id: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string | null;
  location: string | null;
  capacity: number;
  spotsTaken: number;
  status: DiscoveryEventStatus;
  organization: {
    id: number;
    name: string;
  };
}

export interface EventDiscoveryFilters {
  search?: string;
  organizationId?: number;
  from?: string;
  to?: string;
}

export type EventDetailStatus = "DRAFT" | "PUBLISHED" | "CANCELED" | "COMPLETED";
export type RegistrationStatus = "NOT_REGISTERED" | "REGISTERED" | "CANCELLED";

export interface EventDetails {
  id: number;
  title: string;
  description: string;
  organization: { id: number; name: string };
  date: string;
  startTime: string;
  endTime: string | null;
  location: string | null;
  capacity: number;
  registrationCount: number;
  registrationAvailable: boolean;
  status: EventDetailStatus;
  registrationStatus: RegistrationStatus;
}

export interface RegistrationResponse { id: number; eventId: number; userId: number; }

export interface AnnouncementResponse { id: number; eventId: number; title: string; content: string; }

export type OrganizationEventStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "COMPLETED"
  | "CANCELED";

export interface OrganizationEvent {
  id: number;
  organizationId: number;
  categoryId: number;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string | null;
  location: string | null;
  capacity: number | null;
  status: OrganizationEventStatus;
  registrationCount: number;
}

export type OrganizationEventStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "COMPLETED"
  | "CANCELED";

export interface OrganizationEvent {
  id: number;
  organizationId: number;
  categoryId: number;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string | null;
  location: string | null;
  capacity: number | null;
  status: OrganizationEventStatus;
  registrationCount: number;
}
