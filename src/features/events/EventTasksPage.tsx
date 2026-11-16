import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { ApiError } from "../../shared/api/client";
import { getOrganizationMembers } from "../../shared/api/organizations";
import type { OrganizationMemberResponse } from "../../shared/api/types";
import {
  Avatar,
  Button,
  EmptyState,
  ErrorState,
  InfoBanner,
  Modal,
  Select,
  TableSkeleton,
  TextArea,
  useToast,
} from "../../shared/ui";
import { useAuth } from "../auth/AuthProvider";
import { createEventTask, deleteEventTask, getEventTasks, getOrganizationEvent, updateEventTask } from "./api";
import { canChangeTasks, memberRoleLabel, toTaskRequest, type EventTask } from "./eventTasks";

// Figma Organization Screens > "Org – Event: Tasks" (15:412). Rendered inside the T72 event workspace shell.

type ModalState = { mode: "add" } | { mode: "edit"; task: EventTask };
type FieldErrors = { description?: string; assigneeUserId?: string };

function parseId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function memberOptionLabel(member: OrganizationMemberResponse): string {
  const name = member.fullName ?? `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim();
  const role = member.role === "MANAGER" ? "Manager" : member.role === "MEMBER" ? "Member" : undefined;
  return role ? `${name} · ${role}` : name;
}

function TaskModal({
  state,
  members,
  membersUnavailable,
  saving,
  removing,
  errors,
  onSave,
  onRemove,
  onClose,
}: {
  state: ModalState;
  members: OrganizationMemberResponse[];
  membersUnavailable: boolean;
  saving: boolean;
  removing: boolean;
  errors: FieldErrors;
  onSave: (description: string, assignee: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const editing = state.mode === "edit";
  const [description, setDescription] = useState(editing ? state.task.description : "");
  const [assignee, setAssignee] = useState(editing && state.task.assignee ? String(state.task.assignee.id) : "");
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(description, assignee);
  };

  if (confirmingRemove) {
    return (
      <Modal open title="Remove task" onClose={onClose}>
        <p className="event-task-confirm">Remove this task? This can't be undone.</p>
        <div className="event-task-modal-actions">
          <Button type="button" variant="Secondary" onClick={() => setConfirmingRemove(false)}>Cancel</Button>
          <Button type="button" variant="Danger" loading={removing} data-testid="event-task-confirm-remove" onClick={onRemove}>Remove task</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open title={editing ? "Edit task" : "Add task"} onClose={onClose}>
      <form className="event-task-form" noValidate onSubmit={submit}>
        <TextArea
          label="Description"
          name="description"
          data-testid="event-task-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          error={errors.description}
          height={96}
        />
        <Select
          label="Assignee"
          name="assigneeUserId"
          data-testid="event-task-assignee"
          value={assignee}
          onChange={(event) => setAssignee(event.target.value)}
          error={errors.assigneeUserId}
        >
          <option value="">Unassigned</option>
          {membersUnavailable && <option disabled>Members unavailable</option>}
          {members.map((member) => (
            <option key={member.id} value={member.id}>{memberOptionLabel(member)}</option>
          ))}
        </Select>
        <div className="event-task-modal-actions">
          {editing && (
            <Button type="button" variant="Danger" className="event-task-remove" data-testid="event-task-remove" onClick={() => setConfirmingRemove(true)}>
              Remove task
            </Button>
          )}
          <Button type="button" variant="Secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving} data-testid="event-task-save">Save task</Button>
        </div>
      </form>
    </Modal>
  );
}

export function EventTasksPage() {
  const params = useParams();
  const organizationId = parseId(params.organizationId) as number;
  const eventId = parseId(params.eventId) as number;
  const { isManagerOf } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<ModalState | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const tasksKey = ["event-tasks", organizationId, eventId];
  const eventKey = ["organization-event", organizationId, eventId];
  // Same query as the T72 shell, so the event comes from the cache.
  const eventQuery = useQuery({ queryKey: eventKey, queryFn: () => getOrganizationEvent(organizationId, eventId) });
  const tasksQuery = useQuery({ queryKey: tasksKey, queryFn: () => getEventTasks(organizationId, eventId) });
  const membersQuery = useQuery({ queryKey: ["organization-members", organizationId], queryFn: () => getOrganizationMembers(organizationId) });

  const manager = isManagerOf(organizationId);
  const editable = eventQuery.data ? canChangeTasks(eventQuery.data) : false;
  const canManage = manager && editable;
  const ended = eventQuery.data !== undefined && eventQuery.data.status !== "CANCELED" && !editable;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: tasksKey });
    void queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
  };

  const closeModal = () => {
    setModal(null);
    setFieldErrors({});
  };

  const handleError = (error: unknown) => {
    if (error instanceof ApiError && error.status === 409) {
      // The event was canceled or ended meanwhile: explain, refresh the event and the list.
      toast.error("Couldn't change the task", error.message);
      closeModal();
      void queryClient.invalidateQueries({ queryKey: eventKey });
      refresh();
      return;
    }
    if (error instanceof ApiError && (error.fieldErrors.description || error.fieldErrors.assigneeUserId)) {
      setFieldErrors({ description: error.fieldErrors.description, assigneeUserId: error.fieldErrors.assigneeUserId });
      return;
    }
    toast.error("Couldn't save the task", error instanceof ApiError ? error.message : "Check your connection and try again.");
  };

  const saveMutation = useMutation({
    mutationFn: ({ description, assignee }: { description: string; assignee: string }) => {
      const request = toTaskRequest(description, assignee);
      return modal?.mode === "edit"
        ? updateEventTask(organizationId, eventId, modal.task.id, request)
        : createEventTask(organizationId, eventId, request);
    },
    onSuccess: () => {
      toast.success(modal?.mode === "edit" ? "Task updated" : "Task added", "The task list is up to date.");
      closeModal();
      refresh();
    },
    onError: handleError,
  });

  const removeMutation = useMutation({
    mutationFn: (taskId: number) => deleteEventTask(organizationId, eventId, taskId),
    onSuccess: () => {
      toast.success("Task removed", "The task list is up to date.");
      closeModal();
      refresh();
    },
    onError: handleError,
  });

  const save = (description: string, assignee: string) => {
    if (!description.trim()) {
      setFieldErrors({ description: "Task description is required" });
      return;
    }
    setFieldErrors({});
    saveMutation.mutate({ description, assignee });
  };

  const openAdd = () => {
    setFieldErrors({});
    setModal({ mode: "add" });
  };

  let content;
  if (tasksQuery.isPending) {
    content = <TableSkeleton rows={3} />;
  } else if (tasksQuery.isError) {
    content = (
      <ErrorState
        title="We couldn’t load the tasks"
        description="Check your connection and try again. If the problem persists, contact the UBB Events team."
        errorCode={tasksQuery.error instanceof ApiError ? `HTTP_${tasksQuery.error.status}` : "NETWORK_ERROR"}
        onRetry={() => void tasksQuery.refetch()}
        testId="event-tasks-error"
        retryTestId="event-tasks-retry"
      />
    );
  } else if (tasksQuery.data.length === 0) {
    content = canManage ? (
      <EmptyState icon="Calendar" title="No tasks yet" description="Add the first task for this event." actionLabel="Add task" onAction={openAdd} testId="event-tasks-empty" />
    ) : (
      <EmptyState icon="Calendar" title="No tasks yet" description="No tasks have been added to this event yet." testId="event-tasks-empty" />
    );
  } else {
    content = (
      <div className="ui-table-wrap event-tasks-table">
        <table>
          <thead>
            <tr>
              <th scope="col">Task</th>
              <th scope="col" className="event-tasks-col-assignee">Assigned to</th>
              {canManage && <th scope="col" className="event-tasks-col-action" aria-label="Actions" />}
            </tr>
          </thead>
          <tbody>
            {tasksQuery.data.map((task) => {
              const role = task.assignee ? memberRoleLabel(membersQuery.data, task.assignee.id) : undefined;
              return (
                <tr key={task.id} data-testid={`event-task-row-${task.id}`}>
                  <td className="event-tasks-description">{task.description}</td>
                  <td className="event-tasks-col-assignee">
                    {task.assignee ? (
                      <span className="event-tasks-assignee">
                        <Avatar firstName={task.assignee.firstName} lastName={task.assignee.lastName} size={36} />
                        <span>
                          <strong>{task.assignee.firstName} {task.assignee.lastName}</strong>
                          {role && <small>{role}</small>}
                        </span>
                      </span>
                    ) : (
                      <span className="event-tasks-unassigned">Unassigned</span>
                    )}
                  </td>
                  {canManage && (
                    <td className="event-tasks-col-action">
                      <Button
                        type="button"
                        variant="Ghost"
                        size="Sm"
                        data-testid={`event-task-edit-${task.id}`}
                        aria-label={`Edit task: ${task.description}`}
                        onClick={() => {
                          setFieldErrors({});
                          setModal({ mode: "edit", task });
                        }}
                      >
                        Edit
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <section className="event-tasks-page" data-testid="page-org-event-tasks" aria-labelledby="event-tasks-title">
      <header className="event-tasks-header">
        <div>
          <h2 id="event-tasks-title">Event tasks</h2>
          <p>Only visible to organization members, never shown on the public event page.</p>
        </div>
        {canManage && (
          <Button type="button" size="Sm" data-testid="event-tasks-add" onClick={openAdd}>Add task</Button>
        )}
      </header>
      {ended && (
        <div data-testid="event-tasks-ended">
          <InfoBanner>This event has ended, so its tasks can no longer be changed.</InfoBanner>
        </div>
      )}
      {content}
      {modal && (
        <TaskModal
          key={modal.mode === "edit" ? `edit-${modal.task.id}` : "add"}
          state={modal}
          members={membersQuery.data ?? []}
          membersUnavailable={membersQuery.isError}
          saving={saveMutation.isPending}
          removing={removeMutation.isPending}
          errors={fieldErrors}
          onSave={save}
          onRemove={() => modal.mode === "edit" && removeMutation.mutate(modal.task.id)}
          onClose={closeModal}
        />
      )}
    </section>
  );
}
