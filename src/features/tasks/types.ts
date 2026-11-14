export type MyTaskEventStatus = "DRAFT" | "PUBLISHED" | "CANCELED";

/** One item of GET /api/users/me/tasks (backend MyTaskResponse, T27). */
export interface MyTask {
  id: number;
  description: string;
  event: {
    id: number;
    title: string;
    date: string;
    startTime: string;
    status: MyTaskEventStatus;
  };
  organization: {
    id: number;
    name: string;
  };
}
