import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ApiError } from "../../shared/api/client";
import { getOrganizations } from "../../shared/api/organizations";
import {
  Button,
  EmptyState,
  ErrorState,
  EventCard,
  EventCardSkeleton,
  FilterChip,
  SearchField,
  useToast,
} from "../../shared/ui";
import type { EventCardEvent } from "../../shared/ui/EventCard";
import { getEvents } from "./api";
import type { EventDiscoveryFilters, EventSummary } from "./types";

const FILTER_PARAMS = ["search", "organizationId", "from", "to", "openOnly"] as const;
const INITIAL_VISIBLE_EVENTS = 6;

function validOrganizationId(value: string | null): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const organizationId = Number(value);
  return Number.isSafeInteger(organizationId) && organizationId > 0
    ? organizationId
    : undefined;
}

function eventHasEnded(event: EventSummary, now = Date.now()): boolean {
  const time = event.endTime || event.startTime || "00:00:00";
  const endTime = new Date(`${event.date}T${time}`).getTime();
  return Number.isFinite(endTime) && endTime <= now;
}

function toEventCard(event: EventSummary): EventCardEvent {
  const ended =
    event.status !== "CANCELED" &&
    (event.status === "COMPLETED" || eventHasEnded(event));
  const status =
    event.status === "CANCELED" ? "CANCELED" : ended ? "COMPLETED" : "OPEN";
  return {
    id: String(event.id),
    title: event.title,
    organizationName: event.organization.name,
    location: event.location ?? "Location to be announced",
    startsAt: `${event.date}T${event.startTime || "00:00:00"}`,
    capacity: event.capacity,
    spotsTaken: event.spotsTaken,
    status,
  };
}

function isOpenForRegistration(event: EventSummary, now = Date.now()): boolean {
  return (
    event.status === "PUBLISHED" &&
    !eventHasEnded(event, now) &&
    event.capacity > 0 &&
    event.spotsTaken < event.capacity
  );
}

export function DiscoverEventsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const toastErrorRef = useRef<unknown>(null);
  const [openFilter, setOpenFilter] = useState<"organization" | "date" | null>(
    null,
  );
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_EVENTS);

  const search = searchParams.get("search") ?? "";
  const organizationId = validOrganizationId(
    searchParams.get("organizationId"),
  );
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const openOnly = searchParams.get("openOnly") === "true";
  const filters: EventDiscoveryFilters = {
    search: search.trim() || undefined,
    organizationId,
    from: from || undefined,
    to: to || undefined,
  };

  const eventsQuery = useQuery({
    queryKey: ["events", "discover", filters],
    queryFn: () => getEvents(filters),
  });
  const organizationsQuery = useQuery({
    queryKey: ["organizations", "discover-filter"],
    queryFn: getOrganizations,
  });

  useEffect(() => {
    if (eventsQuery.isError && toastErrorRef.current !== eventsQuery.error) {
      const message =
        eventsQuery.error instanceof ApiError
          ? eventsQuery.error.message
          : "Please try again.";
      toast.error("Couldn’t load events", message);
      toastErrorRef.current = eventsQuery.error;
    } else if (!eventsQuery.isError) {
      toastErrorRef.current = null;
    }
  }, [eventsQuery.error, eventsQuery.isError, toast]);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_EVENTS);
  }, [search, organizationId, from, to, openOnly]);

  function updateParam(name: (typeof FILTER_PARAMS)[number], value: string) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(name, value);
        else next.delete(name);
        return next;
      },
      { replace: true },
    );
  }

  function clearFilters() {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        FILTER_PARAMS.forEach((name) => next.delete(name));
        return next;
      },
      { replace: true },
    );
    setOpenFilter(null);
  }

  const allEvents = eventsQuery.data ?? [];
  const matchingEvents = openOnly
    ? allEvents.filter((event) => isOpenForRegistration(event))
    : allEvents;
  const visibleEvents = matchingEvents.slice(0, visibleCount);
  const hasFilters = FILTER_PARAMS.some((name) => searchParams.has(name));

  return (
    <div data-testid="page-events">
      <main className="discover-events-page" data-testid="discover-events-page">
        <header className="discover-events-header">
          <div>
            <h1>Discover events</h1>
            <p>Find events happening across UBB student organizations.</p>
          </div>
          {!eventsQuery.isLoading && !eventsQuery.isError && (
            <p
              className="discover-result-count"
              data-testid="discover-result-count"
            >
              {matchingEvents.length} {matchingEvents.length === 1 ? "event" : "events"} found
            </p>
          )}
        </header>

        <section
          className="discover-controls"
          aria-label="Search and filter events"
        >
          <SearchField
            data-testid="event-search"
            aria-label="Search events or organizations"
            placeholder="Search events or organizations"
            value={search}
            onChange={(event) =>
              updateParam("search", event.currentTarget.value)
            }
          />
          <div className="discover-filter-row">
            <div className="discover-filter-wrap">
              <FilterChip
                data-testid="organization-filter"
                aria-expanded={openFilter === "organization"}
                active={organizationId !== undefined}
                onClick={() =>
                  setOpenFilter((current) =>
                    current === "organization" ? null : "organization",
                  )
                }
              >
                Organization
              </FilterChip>
              {openFilter === "organization" && (
                <div
                  className="discover-filter-panel"
                  data-testid="organization-filter-panel"
                >
                  <label htmlFor="organization-filter-value">
                    Organization
                  </label>
                  <select
                    id="organization-filter-value"
                    data-testid="organization-filter-value"
                    value={organizationId ? String(organizationId) : ""}
                    onChange={(event) =>
                      updateParam("organizationId", event.currentTarget.value)
                    }
                    disabled={
                      organizationsQuery.isLoading || organizationsQuery.isError
                    }
                  >
                    <option value="">All organizations</option>
                    {(organizationsQuery.data ?? []).map((organization) => (
                      <option
                        key={organization.organizationId}
                        value={organization.organizationId}
                      >
                        {organization.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="discover-filter-wrap">
              <FilterChip
                data-testid="date-range-filter"
                aria-expanded={openFilter === "date"}
                active={Boolean(from || to)}
                onClick={() =>
                  setOpenFilter((current) =>
                    current === "date" ? null : "date",
                  )
                }
              >
                Date range
              </FilterChip>
              {openFilter === "date" && (
                <div
                  className="discover-filter-panel discover-date-panel"
                  data-testid="date-range-filter-panel"
                >
                  <label htmlFor="date-from">From</label>
                  <input
                    id="date-from"
                    data-testid="date-from"
                    type="date"
                    value={from}
                    onChange={(event) =>
                      updateParam("from", event.currentTarget.value)
                    }
                  />
                  <label htmlFor="date-to">To</label>
                  <input
                    id="date-to"
                    data-testid="date-to"
                    type="date"
                    value={to}
                    onChange={(event) =>
                      updateParam("to", event.currentTarget.value)
                    }
                  />
                </div>
              )}
            </div>
            <label className="discover-open-filter">
              <input
                data-testid="open-registration-filter"
                type="checkbox"
                checked={openOnly}
                onChange={(event) =>
                  updateParam(
                    "openOnly",
                    event.currentTarget.checked ? "true" : "",
                  )
                }
              />
              <span className="discover-switch" aria-hidden="true" />
              <span>Open for registration</span>
            </label>
            {hasFilters && (
              <Button
                data-testid="clear-filters"
                variant="Ghost"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            )}
          </div>
          {organizationsQuery.isError && (
            <p
              className="discover-filter-error"
              data-testid="organization-filter-error"
              role="status"
            >
              Organizations are unavailable. You can still search and browse
              events.
            </p>
          )}
        </section>

        {eventsQuery.isLoading && (
          <section
            className="discover-events-grid"
            data-testid="discover-events-grid"
            aria-label="Loading events"
          >
            {Array.from({ length: INITIAL_VISIBLE_EVENTS }, (_, index) => (
              <EventCardSkeleton key={index} />
            ))}
          </section>
        )}

        {eventsQuery.isError && (
          <div className="discover-feedback-wrap">
            <ErrorState
              title="We couldn’t load events"
              description="Check your connection and try again."
              errorCode={
                eventsQuery.error instanceof ApiError
                  ? String(eventsQuery.error.status)
                  : "NETWORK_ERROR"
              }
              onRetry={() => void eventsQuery.refetch()}
            />
          </div>
        )}

        {eventsQuery.isSuccess && matchingEvents.length === 0 && (
          <div className="discover-feedback-wrap">
            <EmptyState
              icon="Search"
              title="No events found"
              description="Try changing your search or clearing the selected filters."
              actionLabel="Clear filters"
              onAction={clearFilters}
            />
          </div>
        )}

        {eventsQuery.isSuccess && matchingEvents.length > 0 && (
          <>
            <section
              className="discover-events-grid"
              data-testid="discover-events-grid"
              aria-label="Events"
            >
              {visibleEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={toEventCard(event)}
                  onViewDetails={() => navigate(`/events/${event.id}`)}
                />
              ))}
            </section>
            {matchingEvents.length > visibleCount && (
              <div className="discover-load-more-wrap">
                <Button
                  data-testid="load-more-events"
                  variant="Secondary"
                  onClick={() =>
                    setVisibleCount((count) => count + INITIAL_VISIBLE_EVENTS)
                  }
                >
                  Load more events
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
