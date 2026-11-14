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
