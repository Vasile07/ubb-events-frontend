import type { AnnouncementResponse } from "./types";

export function AnnouncementItem({ announcement }: { announcement: AnnouncementResponse }) {
  return (
    <article className="event-announcement-item" data-testid="announcement-item">
      <h3>{announcement.title}</h3>
      <p>{announcement.content}</p>
    </article>
  );
}
