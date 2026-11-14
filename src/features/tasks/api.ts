import { apiFetch } from "../../shared/api/client";
import type { MyTask } from "./types";

export function getMyTasks(): Promise<MyTask[]> {
  return apiFetch<MyTask[]>("/api/users/me/tasks");
}
