import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../../shared/api/client";
import {
  Badge,
  Button,
  DateBlock,
  EmptyState,
  ErrorState,
  Icon,
  PageHeader,
  Skeleton,
  type IconName,
} from "../../shared/ui";
import { getMyTasks } from "./api";
import {
  eventStatusBadge,
  formatTaskEventDate,
  groupTasksByEvent,
  summarizeTasks,
  type TaskEventGroup,
} from "./myTasks";

function StatTile({ icon, value, label, testId }: { icon: IconName; value: number; label: string; testId: string }) {
  return (
    <div className="my-tasks-stat" data-testid={testId}>
      <span className="my-tasks-stat-icon" aria-hidden="true">
        <Icon name={icon} />
      </span>
      <span className="my-tasks-stat-copy">
        <strong>{value}</strong>
        <span>{label}</span>
      </span>
    </div>
  );
}

function TaskGroupCard({ group, onOpenWorkspace }: { group: TaskEventGroup; onOpenWorkspace: () => void }) {
  const { event, organization, tasks } = group;
  const date = formatTaskEventDate(event.date, event.startTime);
  const badge = eventStatusBadge(event.status);
  return (
    <article className="my-tasks-group" data-testid={`my-task-group-${event.id}`} aria-labelledby={`my-task-group-title-${event.id}`}>
      <header className="my-tasks-group-header">
        <div className="my-tasks-date">
          <DateBlock month={date.month} day={date.day} />
        </div>
        <div className="my-tasks-group-info">
          <h2 id={`my-task-group-title-${event.id}`}>{event.title}</h2>
          <p className="my-tasks-group-meta">
            <span><Icon name="building" />{organization.name}</span>
            <span><Icon name="clock" />{date.label}</span>
          </p>
        </div>
        <Badge tone={badge.tone}>{badge.label}</Badge>
        <Button variant="Secondary" size="Sm" type="button" onClick={onOpenWorkspace}>
          Open event workspace
        </Button>
      </header>
      <ul className="my-tasks-list">
        {tasks.map((task) => (
          <li key={task.id} className="my-tasks-item">
            <span className="my-tasks-item-icon" aria-hidden="true">
              <Icon name="tasks" />
            </span>
            <span data-testid={`my-task-${task.id}`}>{task.description}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function MyTasksSkeleton() {
  return (
    <div className="my-tasks-skeleton" data-testid="my-tasks-skeleton" aria-busy="true" aria-label="Loading your tasks">
      <div className="my-tasks-stats" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="my-tasks-stat-skeleton" height={104} radius={20} />
        ))}
      </div>
      {[0, 1].map((card) => (
        <div key={card} className="my-tasks-group" aria-hidden="true">
          <div className="my-tasks-group-header">
            <Skeleton width={64} height={72} radius={14} />
            <div className="my-tasks-group-info">
              <Skeleton width="45%" height={22} />
              <Skeleton width="30%" height={14} />
            </div>
          </div>
          <Skeleton height={54} radius={14} />
          <Skeleton height={54} radius={14} />
        </div>
      ))}
    </div>
  );
}

export function MyTasksPage() {
  const navigate = useNavigate();
  const query = useQuery({ queryKey: ["my-tasks"], queryFn: getMyTasks });

  let content;
  if (query.isPending) {
    content = <MyTasksSkeleton />;
  } else if (query.isError) {
    content = (
      <ErrorState
        title="We couldn’t load your tasks"
        description="Check your connection and try again. If the problem persists, contact the UBB Events team."
        errorCode={query.error instanceof ApiError ? `HTTP_${query.error.status}` : "NETWORK_ERROR"}
        onRetry={() => void query.refetch()}
        testId="my-tasks-error"
        retryTestId="my-tasks-retry"
      />
    );
  } else if (query.data.length === 0) {
    content = (
      <EmptyState
        icon="Users"
        title="No tasks assigned yet"
        description="When an organizer assigns you a task, it will appear here."
        testId="my-tasks-empty"
      />
    );
  } else {
    const summary = summarizeTasks(query.data);
    content = (
      <>
        <div className="my-tasks-stats">
          <StatTile icon="tasks" value={summary.tasks} label="Assigned tasks" testId="my-tasks-stat-tasks" />
          <StatTile icon="calendar" value={summary.events} label="Events involved" testId="my-tasks-stat-events" />
          <StatTile icon="building" value={summary.organizations} label="Organizations" testId="my-tasks-stat-organizations" />
        </div>
        {groupTasksByEvent(query.data).map((group) => (
          <TaskGroupCard
            key={group.event.id}
            group={group}
            onOpenWorkspace={() =>
              navigate(`/org/${group.organization.id}/events/${group.event.id}/tasks`)
            }
          />
        ))}
      </>
    );
  }

  return (
    <div className="my-tasks-page" data-testid="page-my-tasks">
      <PageHeader title="My tasks" subtitle="Tasks assigned to you by event organizers." />
      {content}
    </div>
  );
}
