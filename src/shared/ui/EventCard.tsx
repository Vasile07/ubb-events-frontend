import { Badge } from "./Badge";
import { Button } from "./Button";
import { Icon } from "./LayoutComponents";
import { ProgressBar } from "./LayoutComponents";
import { formatEventDate } from "../lib/formatEventDate";
import { getEventBadge, type EventStatusInput, type RegistrationStatus } from "../lib/eventStatus";

export type EventCardEvent = EventStatusInput & {
  id: string;
  title: string;
  organizationName: string;
  location: string;
  startsAt: string | Date;
  coverImageUrl?: string;
};

export function EventCard({ event, registrationStatus = "NONE", onViewDetails }: {
  event: EventCardEvent;
  registrationStatus?: RegistrationStatus;
  onViewDetails?: (event: EventCardEvent) => void;
}) {
  const badge = getEventBadge(event, registrationStatus);
  const coverStyle = event.coverImageUrl ? { backgroundImage: `url(${event.coverImageUrl})` } : undefined;
  return (
    <article className="ui-event-card" data-testid={`event-card-${event.id}`}>
      <div className="ui-event-card-cover" style={coverStyle}>
        <img className="ui-event-card-decor ui-event-card-decor-one" src="/ui-assets/event-card-decor.svg" alt="" aria-hidden="true" />
        <img className="ui-event-card-decor ui-event-card-decor-two" src="/ui-assets/event-card-decor-2.svg" alt="" aria-hidden="true" />
        <span className="ui-event-card-date" data-testid="event-date"><Icon name="calendar" />{formatEventDate(event.startsAt)}</span>
        <Badge tone={badge.tone}>{badge.label}</Badge>
      </div>
      <div className="ui-event-card-body">
        <p className="ui-event-card-organization"><Icon name="building" /> {event.organizationName}</p>
        <h3>{event.title}</h3>
        <p className="ui-event-card-location"><Icon name="pin" /> {event.location}</p>
        <ProgressBar value={event.spotsTaken} max={event.capacity} label={`${event.spotsTaken} of ${event.capacity} spots taken`} />
        <div className="ui-event-card-capacity-footer">
          <p className="ui-event-card-capacity">{event.spotsTaken} of {event.capacity} spots taken</p>
          <Button className="ui-event-card-cta" variant="Ghost" size="Sm" type="button" onClick={() => onViewDetails?.(event)}>View details <img className="ui-event-card-chevron" src="/ui-assets/event-card-chevron.svg" alt="" aria-hidden="true" /></Button>
        </div>
      </div>
    </article>
  );
}
