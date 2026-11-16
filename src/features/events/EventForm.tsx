import { useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Select, TextArea, TextField } from "../../shared/ui";
import { getOrganizationMembers } from "../../shared/api/organizations";
import type { OrganizationMemberResponse } from "../../shared/api/types";
import { validateEventForm } from "./eventFormValidation";
import type { EventFormProps, EventFormValues } from "./eventFormTypes";

const defaults: EventFormValues = {
  title: "",
  description: "",
  location: "",
  startDate: "",
  startTime: "",
  endDate: "",
  endTime: "",
  capacity: "1",
  registrationInformation: "",
  tasks: [{ description: "", assigneeId: "" }],
};
function memberLabel(member: OrganizationMemberResponse) {
  return (
    member.fullName ??
    ([member.firstName, member.lastName].filter(Boolean).join(" ") ||
      `Member ${member.id}`)
  );
}

export function EventForm({
  mode,
  organizationId,
  initialValues,
  onSubmit,
  submitting = false,
  fieldErrors = {},
  onDirtyChange,
  submitLabel,
  onCancel,
}: EventFormProps) {
  const [values, setValues] = useState<EventFormValues>({
    ...defaults,
    ...initialValues,
    tasks: initialValues?.tasks?.length
      ? initialValues.tasks
      : mode === "create"
        ? defaults.tasks
        : [],
  });
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const members = useQuery({
    queryKey: ["organization-members", organizationId],
    queryFn: () => getOrganizationMembers(organizationId),
    enabled: mode === "create",
  });
  const errors = { ...localErrors, ...fieldErrors };
  const summary = useMemo(
    () => Object.values(errors).filter(Boolean),
    [errors],
  );
  const update = (key: keyof EventFormValues, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next = validateEventForm(values, mode);
    setLocalErrors(next);
    if (Object.keys(next).length === 0) await onSubmit(values);
  };
  const taskError = (index: number, key: string) =>
    errors[`tasks[${index}].${key}`];
  const addTask = () => {
    onDirtyChange?.(true);
    setValues((current) => ({
      ...current,
      tasks: [...current.tasks, { description: "", assigneeId: "" }],
    }));
  };
  const removeTask = (index: number) => {
    onDirtyChange?.(true);
    setValues((current) => ({
      ...current,
      tasks: current.tasks.filter((_, itemIndex) => itemIndex !== index),
    }));
  };
  return (
    <form
      className="event-form"
      data-testid="event-form"
      onSubmit={submit}
      onChange={() => onDirtyChange?.(true)}
      noValidate
    >
      {summary.length > 0 && (
        <div
          className="event-form-summary"
          data-testid="event-form-summary"
          role="alert"
        >
          <strong>Check the following:</strong>
          <ul>
            {summary.map((message, index) => (
              <li key={`${message}-${index}`}>{message}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="event-form-layout">
        <div>
          <section className="event-form-section">
            <h2>Event details</h2>
            <div className="event-form-grid">
              <TextField
                label="Title"
                name="title"
                value={values.title}
                onChange={(e) => update("title", e.target.value)}
                error={errors.title}
                required
              />
              <TextArea
                label="Description"
                name="description"
                value={values.description}
                onChange={(e) => update("description", e.target.value)}
                error={errors.description}
                required
              />
              <TextField
                label="Location"
                name="location"
                value={values.location}
                onChange={(e) => update("location", e.target.value)}
                error={errors.location}
                required
              />
            </div>
          </section>
          <section className="event-form-section">
            <h2>Schedule &amp; capacity</h2>
            <div className="event-form-grid event-form-grid-four">
              <TextField
                label="Start date"
                type="date"
                name="startDate"
                value={values.startDate}
                onChange={(e) => update("startDate", e.target.value)}
                error={errors.startDate}
                required
              />
              <TextField
                label="Start time"
                type="time"
                name="startTime"
                value={values.startTime}
                onChange={(e) => update("startTime", e.target.value)}
                error={errors.startTime}
                required
              />
              <TextField
                label="End date"
                type="date"
                name="endDate"
                value={values.endDate}
                onChange={(e) => update("endDate", e.target.value)}
                error={errors.endDate}
                required
                disabled={mode === "edit"}
              />
              <TextField
                label="End time"
                type="time"
                name="endTime"
                value={values.endTime}
                onChange={(e) => update("endTime", e.target.value)}
                error={errors.endTime}
                required
              />
              <TextField
                label="Capacity"
                type="number"
                min="1"
                name="capacity"
                value={values.capacity}
                onChange={(e) => update("capacity", e.target.value)}
                error={errors.capacity}
                required
              />
              <TextArea
                label="Registration information"
                name="registrationInformation"
                value={values.registrationInformation}
                onChange={(e) =>
                  update("registrationInformation", e.target.value)
                }
                disabled={mode === "edit"}
              />
            </div>
          </section>
          {mode === "create" && (
            <section className="event-form-section">
              <h2>Tasks</h2>
              {values.tasks.map((task, index) => (
                <div
                  className="event-task-row"
                  data-testid="task-row"
                  key={index}
                >
                  <TextField
                    label={`Task ${index + 1}`}
                    name={`tasks[${index}].description`}
                    value={task.description}
                    onChange={(e) =>
                      setValues((current) => ({
                        ...current,
                        tasks: current.tasks.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, description: e.target.value }
                            : item,
                        ),
                      }))
                    }
                    error={taskError(index, "description")}
                  />
                  <Select
                    label="Assignee"
                    name={`tasks[${index}].assigneeId`}
                    value={task.assigneeId}
                    onChange={(e) =>
                      setValues((current) => ({
                        ...current,
                        tasks: current.tasks.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, assigneeId: e.target.value }
                            : item,
                        ),
                      }))
                    }
                    error={taskError(index, "assigneeId")}
                  >
                    <option value="">Select member</option>
                    {members.isLoading && (
                      <option disabled>Loading members…</option>
                    )}
                    {members.isError && (
                      <option disabled>Members unavailable</option>
                    )}
                    {!members.isLoading &&
                      !members.isError &&
                      members.data?.length === 0 && (
                        <option disabled>No members found</option>
                      )}
                    {(members.data ?? []).map((member) => (
                      <option key={member.id} value={member.id}>
                        {memberLabel(member)}
                      </option>
                    ))}
                  </Select>
                  <Button
                    type="button"
                    variant="Ghost"
                    onClick={() => removeTask(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              {members.isLoading && (
                <p data-testid="members-loading" role="status">
                  Loading members…
                </p>
              )}
              {members.isError && (
                <p data-testid="members-error" role="alert">
                  Couldn’t load members. Try again.
                </p>
              )}
              {!members.isLoading &&
                !members.isError &&
                members.data?.length === 0 && (
                  <p data-testid="members-empty">
                    No organization members are available.
                  </p>
                )}
              <Button
                type="button"
                variant="Secondary"
                data-testid="add-task"
                onClick={addTask}
              >
                Add another task
              </Button>
            </section>
          )}
        </div>
        <aside className="event-form-aside">
          {mode === "create" ? (
            <>
              <section data-testid="event-lifecycle-card">
                <h2>Event lifecycle</h2>
                <p>
                  Save your event as a draft, then publish it when the details
                  are ready.
                </p>
                <ol>
                  <li>Draft</li>
                  <li>Published</li>
                  <li>Completed</li>
                </ol>
              </section>
              <section data-testid="publish-checklist">
                <h2>Before you publish</h2>
                <ul>
                  <li>Event details are complete</li>
                  <li>Schedule and capacity are set</li>
                  <li>Tasks have assignees</li>
                </ul>
              </section>
            </>
          ) : (
            <>
              <section
                data-testid="event-edit-published-notice"
                className="event-edit-guidance"
              >
                <div data-testid="event-information-card">
                  <h2>Editing a published event</h2>
                  <p>
                    Participants see the new details immediately. For important
                    changes, also post an announcement so registered students
                    are informed.
                  </p>
                </div>
              </section>
              <section data-testid="current-status-card">
                <h2>Current status</h2>
                <span>{values.status ?? "Draft"}</span>
                <strong className="event-edit-registration-metric">
                  {values.activeRegistrations ?? 0} / {values.capacity || "—"}
                </strong>
                <span>Active registrations</span>
              </section>
            </>
          )}
        </aside>
      </div>
      <div className="event-form-actions">
        {onCancel && (
          <Button
            type="button"
            variant="Secondary"
            data-testid="event-form-cancel"
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          loading={submitting}
          disabled={submitting}
          data-testid="event-form-submit"
        >
          {submitLabel ?? (mode === "create" ? "Create event" : "Save changes")}
        </Button>
      </div>
    </form>
  );
}
