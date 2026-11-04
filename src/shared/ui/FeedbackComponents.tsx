import {
  Component,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Button } from "./Button";
import { Icon } from "./LayoutComponents";

export type ToastType = "Success" | "Error";

export type ToastOptions = {
  type: ToastType;
  title: string;
  message: string;
  durationMs?: number;
};

type ToastEntry = ToastOptions & { id: number };

type ToastContextValue = {
  showToast: (toast: ToastOptions) => void;
  dismissToast: (id: number) => void;
  success: (title: string, message: string) => void;
  error: (title: string, message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function Toast({
  type,
  title,
  message,
  onClose,
}: ToastOptions & { onClose: () => void }) {
  const isError = type === "Error";
  return (
    <article
      className={`ui-toast ${isError ? "ui-toast-error" : "ui-toast-success"}`}
      data-testid={`toast-${type.toLowerCase()}`}
      role={isError ? "alert" : "status"}
      aria-atomic="true"
    >
      <span className="ui-toast-icon" aria-hidden="true">
        {isError ? <img src="/ui-assets/feedback-alert-circle.svg" alt="" /> : <Icon name="check" />}
      </span>
      <span className="ui-toast-copy">
        <strong>{title}</strong>
        <span>{message}</span>
      </span>
      <button
        className="ui-toast-close"
        data-testid={`toast-${type.toLowerCase()}-close`}
        type="button"
        aria-label="Close notification"
        onClick={onClose}
      >
        <Icon name="x" />
      </button>
    </article>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());

  const dismissToast = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((toast: ToastOptions) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { ...toast, id }]);
    const timer = window.setTimeout(() => {
      timers.current.delete(id);
      setToasts((current) => current.filter((entry) => entry.id !== id));
    }, toast.durationMs ?? 5000);
    timers.current.set(id, timer);
  }, []);

  useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current.clear();
  }, []);

  const contextValue: ToastContextValue = {
    showToast,
    dismissToast,
    success: (title, message) => showToast({ type: "Success", title, message }),
    error: (title, message) => showToast({ type: "Error", title, message }),
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="ui-toast-region" data-testid="toast-region" aria-label="Notifications" aria-live="polite" aria-relevant="additions removals">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onClose={() => dismissToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export type EmptyStateIcon = "Search" | "Calendar" | "Ticket" | "Users";

const emptyIconAssets: Record<EmptyStateIcon, string> = {
  Search: "/ui-assets/feedback-search.svg",
  Calendar: "/ui-assets/feedback-calendar.svg",
  Ticket: "/ui-assets/feedback-ticket.svg",
  Users: "/ui-assets/feedback-users.svg",
};

export function EmptyState({
  icon = "Search",
  title = "Nothing here yet",
  description = "There is nothing to show right now.",
  actionLabel,
  onAction,
  testId = "empty-state",
}: {
  icon?: EmptyStateIcon;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  testId?: string;
}) {
  return (
    <section className="ui-empty-state" data-testid={testId} aria-labelledby={`${testId}-title`}>
      <span className="ui-empty-icon" aria-hidden="true">
        <img src={emptyIconAssets[icon]} alt="" />
      </span>
      <h3 id={`${testId}-title`}>{title}</h3>
      <p>{description}</p>
      {actionLabel && onAction && (
        <Button data-testid="empty-state-action" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </section>
  );
}

export function Skeleton({
  width,
  height = 14,
  radius = 8,
  testId = "skeleton-block",
  className = "",
}: {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  radius?: CSSProperties["borderRadius"];
  testId?: string;
  className?: string;
}) {
  return (
    <span
      className={`ui-skeleton ${className}`.trim()}
      data-testid={testId}
      aria-hidden="true"
      style={{ width, height, borderRadius: radius }}
    />
  );
}

export function EventCardSkeleton() {
  return (
    <div className="ui-event-card-skeleton" data-testid="event-card-skeleton" aria-busy="true" aria-label="Loading event">
      <Skeleton className="ui-event-card-skeleton-image" height={132} radius={0} testId="event-card-skeleton-block" />
      <div className="ui-event-card-skeleton-content">
        <Skeleton width={110} height={12} testId="event-card-skeleton-block" />
        <Skeleton height={22} testId="event-card-skeleton-block" />
        <Skeleton height={14} testId="event-card-skeleton-block" />
        <Skeleton width={150} height={14} testId="event-card-skeleton-block" />
        <Skeleton height={6} radius="999px" testId="event-card-skeleton-block" />
        <Skeleton width={130} height={12} testId="event-card-skeleton-block" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="ui-table-skeleton" data-testid="table-skeleton" aria-busy="true" aria-label="Loading events">
      <div className="ui-table-skeleton-head" aria-hidden="true">
        <Skeleton width={64} height={12} />
        <Skeleton width={58} height={12} />
        <Skeleton width={66} height={12} />
        <Skeleton width={108} height={12} />
        <span />
      </div>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div className="ui-table-skeleton-row" key={rowIndex} aria-hidden="true">
          <span className="ui-table-skeleton-event">
            <Skeleton width={260} height={14} />
            <Skeleton width={140} height={10} />
          </span>
          <Skeleton width={110} height={14} />
          <Skeleton width={90} height={24} radius="999px" />
          <Skeleton width={70} height={14} />
          <Skeleton width={100} height={32} radius={10} />
        </div>
      ))}
    </div>
  );
}

export function ErrorState({
  title = "We couldn’t load events",
  description = "Check your connection and try again. If the problem persists, contact the UBB Events team.",
  errorCode = "NETWORK_ERROR",
  onRetry,
  testId = "error-state",
  retryTestId = "error-state-retry",
}: {
  title?: string;
  description?: string;
  errorCode?: string;
  onRetry?: () => void;
  testId?: string;
  retryTestId?: string;
}) {
  return (
    <section className="ui-error-state" data-testid={testId} aria-labelledby={`${testId}-title`}>
      <span className="ui-error-icon" aria-hidden="true"><Icon name="alert" /></span>
      <h3 id={`${testId}-title`}>{title}</h3>
      <p>{description}</p>
      <Button data-testid={retryTestId} onClick={onRetry}>Try again</Button>
      <small data-testid="error-state-code">Error code: {errorCode}</small>
    </section>
  );
}

type ErrorBoundaryProps = {
  children: ReactNode;
  title?: string;
  description?: string;
  errorCode?: string;
  onRetry?: () => void;
};

type ErrorBoundaryState = { hasError: boolean };

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  private retry = () => {
    this.setState({ hasError: false });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          title={this.props.title}
          description={this.props.description}
          errorCode={this.props.errorCode ?? "UNEXPECTED_ERROR"}
          onRetry={this.retry}
          testId="error-boundary-fallback"
          retryTestId="error-boundary-retry"
        />
      );
    }
    return this.props.children;
  }
}

function DemoCrash({ shouldCrash }: { shouldCrash: boolean }) {
  if (shouldCrash) throw new Error("Intentional error boundary demo");
  return <p data-testid="error-boundary-child">Recovered content</p>;
}

export function FeedbackShowcase() {
  const { showToast } = useToast();
  const [emptyActionSelected, setEmptyActionSelected] = useState(false);
  const [retryRequested, setRetryRequested] = useState(false);
  const [shouldCrash, setShouldCrash] = useState(false);

  return (
    <section className="ui-feedback-demo" data-testid="feedback-demo" aria-labelledby="feedback-components-title">
      <h2 id="feedback-components-title" className="text-heading-h2">Feedback components</h2>

      <section className="ui-feedback-section" aria-labelledby="feedback-toast-title">
        <h3 id="feedback-toast-title">Toast notifications</h3>
        <div className="ui-feedback-actions">
          <Button data-testid="toast-success-trigger" onClick={() => showToast({ type: "Success", title: "Saved", message: "Your changes are ready." })}>Show success toast</Button>
          <Button data-testid="toast-error-trigger" variant="Danger" onClick={() => showToast({ type: "Error", title: "Could not save", message: "Please try again." })}>Show error toast</Button>
        </div>
      </section>

      <section className="ui-feedback-section" aria-labelledby="feedback-empty-title">
        <h3 id="feedback-empty-title">Empty states</h3>
        <div className="ui-feedback-empty-grid">
          <EmptyState icon="Search" title="No events found" description="Try changing your search or filters." testId="empty-state-search" actionLabel="Clear filters" onAction={() => setEmptyActionSelected(true)} />
          <EmptyState icon="Calendar" title="No upcoming events" description="New events will appear here." testId="empty-state-calendar" />
          <EmptyState icon="Ticket" title="No registrations yet" description="Events you register for will appear here." testId="empty-state-ticket" />
          <EmptyState icon="Users" title="No members yet" description="Members will appear here once they join." testId="empty-state-users" />
        </div>
        <p data-testid="empty-action-result" aria-live="polite">{emptyActionSelected ? "Primary action selected" : ""}</p>
      </section>

      <section className="ui-feedback-section" aria-labelledby="feedback-loading-title">
        <h3 id="feedback-loading-title">Loading states</h3>
        <div className="ui-feedback-loading-grid">
          <EventCardSkeleton />
          <TableSkeleton />
        </div>
      </section>

      <section className="ui-feedback-section" aria-labelledby="feedback-error-title">
        <h3 id="feedback-error-title">Error state</h3>
        <ErrorState
          title="We couldn’t load events"
          description="Check your connection and try again."
          errorCode="E-503"
          onRetry={() => setRetryRequested(true)}
        />
        <p data-testid="error-retry-result" aria-live="polite">{retryRequested ? "Retry requested" : ""}</p>
      </section>

      <section className="ui-feedback-section" aria-labelledby="feedback-boundary-title">
        <h3 id="feedback-boundary-title">Error boundary</h3>
        <Button data-testid="error-boundary-trigger" onClick={() => setShouldCrash(true)}>Trigger demo error</Button>
        <ErrorBoundary
          title="Something went wrong"
          description="The demo content could not be rendered."
          errorCode="E-DEMO"
          onRetry={() => setShouldCrash(false)}
        >
          <DemoCrash shouldCrash={shouldCrash} />
        </ErrorBoundary>
      </section>
    </section>
  );
}
