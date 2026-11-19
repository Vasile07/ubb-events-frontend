import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Badge, Button, EmptyState, ErrorState, Skeleton, useToast } from "../../shared/ui";
import { InfoBanner, Modal } from "../../shared/ui/LayoutComponents";
import { cancelRegistration, getMyRegistrations } from "./api";
import type { MyRegistration } from "./types";

type Tab = "active" | "canceled" | "past";

function endOf(item: MyRegistration) { return new Date(`${item.event.date}T${item.event.endTime ?? item.event.startTime}`).getTime(); }
function dateLabel(date: string) { const value = new Date(`${date}T00:00:00`); return { month: value.toLocaleDateString("en-GB", { month: "short" }).toUpperCase(), day: value.getDate() }; }
function timeLabel(item: MyRegistration) { return `${new Date(`${item.event.date}T${item.event.startTime}`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · ${item.event.startTime.slice(0, 5)}${item.event.endTime ? ` – ${item.event.endTime.slice(0, 5)}` : ""}`; }

function tabFor(item: MyRegistration, now = Date.now()): Tab {
  if (item.event.status === "CANCELED") return "canceled";
  if (endOf(item) <= now || item.event.status === "COMPLETED") return "past";
  return "active";
}

export function MyRegistrationsPage() {
  const [tab, setTab] = useState<Tab>("active");
  const [confirming, setConfirming] = useState<MyRegistration | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const query = useQuery({ queryKey: ["my-registrations"], queryFn: getMyRegistrations });
  const mutation = useMutation({
    mutationFn: (eventId: number) => cancelRegistration(eventId),
    onSuccess: () => { setConfirming(null); toast.success("Registration canceled", "Your place has been released."); },
    onError: (error) => toast.error("Couldn’t cancel registration", error instanceof Error ? error.message : "Please try again."),
    onSettled: () => { void queryClient.invalidateQueries({ queryKey: ["my-registrations"] }); void queryClient.invalidateQueries({ queryKey: ["events", "discover"] }); },
  });
  const grouped = useMemo(() => {
    const result: Record<Tab, MyRegistration[]> = { active: [], canceled: [], past: [] };
    (query.data ?? []).forEach((item) => result[tabFor(item)].push(item));
    return result;
  }, [query.data]);

  if (query.isLoading) return <main className="my-registrations-page" data-testid="my-registrations-page"><span data-testid="page-my-registrations">My registrations</span><h1>My registrations</h1><div data-testid="my-registrations-skeleton" aria-busy="true"><Skeleton width="100%" height={100} /><Skeleton width="100%" height={100} /></div></main>;
  if (query.isError) return <main className="my-registrations-page" data-testid="my-registrations-page"><span data-testid="page-my-registrations">My registrations</span><h1>My registrations</h1><ErrorState title="We couldn’t load your registrations" onRetry={() => void query.refetch()} testId="my-registrations-error" retryTestId="my-registrations-retry" /></main>;

  const rows = grouped[tab];
  return <main className="my-registrations-page" data-testid="my-registrations-page"><span data-testid="page-my-registrations">My registrations</span>
    <header className="my-registrations-header"><div><h1>My registrations</h1><p>Events you registered for, past and upcoming.</p></div><div className="my-registrations-tabs" role="tablist" aria-label="Registration status">
      {(["active", "canceled", "past"] as Tab[]).map((key) => <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? "is-active" : ""} onClick={() => setTab(key)}>{key[0].toUpperCase() + key.slice(1)} · {grouped[key].length}</button>)}
    </div></header>
    <InfoBanner>Registration details and updates from organizers appear here.</InfoBanner>
    {rows.length === 0 ? <div data-testid="my-registrations-empty"><EmptyState icon="Ticket" title={`No ${tab} registrations`} description="Events you register for will appear here." actionLabel="Discover events" onAction={() => { window.location.href = "/events"; }} /></div> : <div className="my-registrations-list">{rows.map((item) => { const date = dateLabel(item.event.date); const canceled = tab === "canceled"; return <article className="my-registration-row" data-testid={`registration-row-${item.event.id}`} key={item.registrationId}><div className="date-block"><strong>{date.month}</strong><span>{date.day}</span></div><div className="my-registration-copy"><h2>{item.event.title}</h2><p>{item.event.organization.name}</p><p>{item.event.location ?? "Location to be announced"} · {timeLabel(item)}</p></div><Badge tone={canceled ? "Danger" : tab === "past" ? "Neutral" : "Success"}>{canceled ? "Canceled" : tab === "past" ? "Past" : "Active"}</Badge><div className="my-registration-actions"><Link className="ui-button ui-button-secondary" to={`/events/${item.event.id}`}>View event</Link>{tab === "active" && <Button variant="Danger" disabled={mutation.isPending} onClick={() => setConfirming(item)}>Cancel registration</Button>}</div></article>; })}</div>}
    <Modal open={Boolean(confirming)} title="Cancel registration?" onClose={() => setConfirming(null)}><p>Your place will be released.</p><Button variant="Danger" onClick={() => confirming && mutation.mutate(confirming.event.id)}>Cancel registration</Button><Button variant="Secondary" onClick={() => setConfirming(null)}>Keep registration</Button></Modal>
  </main>;
}
