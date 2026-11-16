import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, useToast } from "../../shared/ui";
import { ApiError } from "../../shared/api/client";
import { EventForm } from "./EventForm";
import { createOrganizationEvent } from "./api";
import type { EventFormValues } from "./eventFormTypes";

export function CreateEventPage() {
  const { organizationId: rawOrganizationId } = useParams();
  const organizationId = Number(rawOrganizationId);
  const navigate = useNavigate();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const keepEditingRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!confirming) return;
    keepEditingRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setConfirming(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [confirming]);

  const submit = async (values: EventFormValues) => {
    setSubmitting(true);
    setFieldErrors({});
    try {
      const result = await createOrganizationEvent(organizationId, values);
      toast.success("Event saved", "Your event was saved as a draft.");
      navigate(`/org/${organizationId}/events/${result.id}/tasks`);
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors);
        if (Object.keys(error.fieldErrors).length === 0) toast.error("Could not save event", error.message);
      } else {
        toast.error("Could not save event", "Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = () => {
    if (dirty) setConfirming(true);
    else navigate(`/org/${organizationId}/events`);
  };

  return <main data-testid="create-event-page" className="event-create-page">
    <div className="event-create-header"><h1>Create event</h1><Button type="button" variant="Secondary" onClick={cancel}>Cancel</Button></div>
    <EventForm mode="create" organizationId={organizationId} onSubmit={submit} submitting={submitting} fieldErrors={fieldErrors} onDirtyChange={setDirty} submitLabel="Save as draft" />
    {confirming && <div className="event-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="cancel-title"><div className="event-confirm-card"><h2 id="cancel-title">Discard event draft?</h2><p>Your entered details will be lost.</p><Button type="button" variant="Danger" onClick={() => navigate(`/org/${organizationId}/events`)}>Discard</Button><Button ref={keepEditingRef} type="button" variant="Secondary" onClick={() => setConfirming(false)}>Keep editing</Button></div></div>}
  </main>;
}
