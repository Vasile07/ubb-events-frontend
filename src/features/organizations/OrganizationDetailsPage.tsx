import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../../shared/api/client";
import { getEvents } from "../events/api";
import type { EventSummary } from "../events/types";
import { getOrganization, requestOrganizationMembership } from "../../shared/api/organizations";
import type { OrganizationMembershipStatus } from "../../shared/api/types";
import { Badge, Button, EmptyState, ErrorState, EventCard, EventCardSkeleton, useToast } from "../../shared/ui";

function statusLabel(status: OrganizationMembershipStatus): string {
  return status === "MEMBER" ? "Member" : status === "PENDING" ? "Pending" : "Not a member";
}

function statusTone(status: OrganizationMembershipStatus) {
  return status === "MEMBER" ? "Success" : status === "PENDING" ? "Warning" : "Neutral";
}

function parseId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function eventToCard(event: EventSummary) {
  return {
    id: String(event.id), title: event.title, organizationName: event.organization.name,
    location: event.location ?? "Location to be announced", startsAt: `${event.date}T${event.startTime}`,
    capacity: event.capacity, spotsTaken: event.spotsTaken, status: event.status === "PUBLISHED" ? "OPEN" as const : event.status,
  };
}

export function OrganizationDetailsPage() {
  const { organizationId } = useParams();
  const id = parseId(organizationId);
  const toast = useToast();
  const [membershipStatus, setMembershipStatus] = useState<OrganizationMembershipStatus | null>(null);
  const [requesting, setRequesting] = useState(false);
  const organizationQuery = useQuery({ queryKey: ["organization", id], queryFn: () => getOrganization(id as number), enabled: id !== null });
  const eventsQuery = useQuery({ queryKey: ["organization-events", id], queryFn: () => getEvents({ organizationId: id as number }), enabled: id !== null && organizationQuery.isSuccess });
  const status = membershipStatus ?? organizationQuery.data?.status ?? "NONE";

  async function requestMembership() {
    if (id === null) return;
    setRequesting(true);
    try {
      await requestOrganizationMembership(id);
      setMembershipStatus("PENDING");
      toast.success("Request sent", "Your membership request is waiting for approval.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setMembershipStatus("PENDING");
        toast.success("Request already pending", "Your membership request is waiting for approval.");
      } else toast.error("Request failed", "We couldn't send your membership request. Try again.");
    } finally { setRequesting(false); }
  }

  if (id === null) return <ErrorState title="Organization not found" description="This organization does not exist." testId="organization-not-found" />;
  if (organizationQuery.isLoading) return <main className="organization-details-page" data-testid="page-organization-details" aria-busy="true"><EventCardSkeleton /><EventCardSkeleton /></main>;
  if (organizationQuery.isError) {
    const notFound = organizationQuery.error instanceof ApiError && organizationQuery.error.status === 404;
    return <ErrorState title={notFound ? "Organization not found" : "We couldn’t load this organization"} description={notFound ? "This organization does not exist." : "Check your connection and try again."} testId={notFound ? "organization-not-found" : "organization-details-error"} onRetry={notFound ? undefined : () => void organizationQuery.refetch()} />;
  }
  const organization = organizationQuery.data;
  if (!organization) return <ErrorState title="Organization not found" description="This organization does not exist." testId="organization-not-found" />;
  const upcoming = (eventsQuery.data ?? []).filter((event) => event.status !== "COMPLETED");
  return (
    <main className="organization-details-page" data-testid="page-organization-details">
      <Link className="organization-details-back" data-testid="organization-back-link" to="/organizations">
        <img src="/ui-assets/organization-arrow-left.svg" alt="" aria-hidden="true" />
        Back to organizations
      </Link>
      <section className="organization-details-hero" aria-labelledby="organization-details-title" data-testid="organization-hero">
        <img className="organization-details-hero-decor" src="/ui-assets/organization-hero-decor.svg" alt="" aria-hidden="true" />
        <div className="organization-details-logo" data-testid="organization-logo-tile" aria-hidden="true">
          <img src="/ui-assets/organization-building.svg" alt="" />
        </div>
        <div className="organization-details-hero-copy">
          <h1 id="organization-details-title">{organization.name}</h1>
          <p>{organization.description || "No description available."}</p>
        </div>
        <div className="organization-details-actions">
          <Badge tone={statusTone(status) as "Success" | "Warning" | "Neutral"}>{statusLabel(status)}</Badge>
          {status === "MEMBER" ? (
            <Link className="ui-button ui-button-secondary ui-button-md" to={`/org/${id}/events`}>Open organization</Link>
          ) : status === "PENDING" ? (
            <Button variant="Secondary" disabled>Waiting for approval</Button>
          ) : (
            <Button variant="Secondary" loading={requesting} onClick={requestMembership}>Request membership</Button>
          )}
        </div>
      </section>
      <div className="organization-details-columns">
        <section className="organization-details-upcoming" aria-labelledby="upcoming-events-title">
          <h2 id="upcoming-events-title">Upcoming events</h2>
          {eventsQuery.isLoading ? (
            <div className="organization-events-grid" aria-busy="true"><EventCardSkeleton /><EventCardSkeleton /></div>
          ) : eventsQuery.isError ? (
            <ErrorState title="We couldn’t load events" onRetry={() => void eventsQuery.refetch()} />
          ) : upcoming.length === 0 ? (
            <EmptyState icon="Calendar" testId="organization-events-empty" title="No upcoming events" description="New events will appear here." />
          ) : (
            <div className="organization-events-grid">
              {upcoming.map((event) => (
                <Link key={event.id} data-testid={`organization-event-${event.id}`} to={`/events/${event.id}`}>
                  <EventCard event={eventToCard(event)} />
                </Link>
              ))}
            </div>
          )}
        </section>
        <aside className="organization-details-about" aria-labelledby="organization-about-title">
          <h2 id="organization-about-title">About</h2>
          <p>Public details only. Members, requests and management tools are available to organization members.</p>
          <ul>
            <li><img src="/ui-assets/organization-lock.svg" alt="" aria-hidden="true" /><span>Member lists are private</span></li>
            <li><img src="/ui-assets/organization-users.svg" alt="" aria-hidden="true" /><span>Membership is approved by managers</span></li>
          </ul>
        </aside>
      </div>
    </main>
  );
}
