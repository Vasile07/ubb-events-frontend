import { canChangeTasks, memberRoleLabel, toTaskRequest } from "../../src/features/events/eventTasks";

// Unit tests for the pure event tasks helpers (no browser page needed).
describe("event tasks helpers", () => {
  // 14 Nov 2026, 20:00 local time.
  const now = new Date(2026, 10, 14, 20, 0, 0);
  const event = (overrides: Partial<{ status: "DRAFT" | "PUBLISHED" | "COMPLETED" | "CANCELED"; date: string; startTime: string; endTime: string | null }>) => ({
    status: "PUBLISHED" as const,
    date: "2026-11-20",
    startTime: "18:00:00",
    endTime: "21:00:00",
    ...overrides,
  });

  it("allows changes for upcoming draft and published events", () => {
    expect(canChangeTasks(event({ status: "DRAFT" }), now)).to.equal(true);
    expect(canChangeTasks(event({ status: "PUBLISHED" }), now)).to.equal(true);
    expect(canChangeTasks(event({ date: "2026-11-14", startTime: "19:00:00", endTime: "21:00:00" }), now)).to.equal(true);
  });

  it("blocks changes for canceled and completed events", () => {
    expect(canChangeTasks(event({ status: "CANCELED" }), now)).to.equal(false);
    expect(canChangeTasks(event({ status: "COMPLETED" }), now)).to.equal(false);
  });

  it("blocks changes once the event has ended, using the end time or the start time", () => {
    expect(canChangeTasks(event({ date: "2026-11-14", startTime: "17:00:00", endTime: "19:30:00" }), now)).to.equal(false);
    expect(canChangeTasks(event({ date: "2026-11-14", startTime: "19:00:00", endTime: null }), now)).to.equal(false);
    expect(canChangeTasks(event({ date: "2026-11-14", startTime: "20:00:00", endTime: null }), now)).to.equal(false);
    expect(canChangeTasks(event({ date: "2026-11-01" }), now)).to.equal(false);
  });

  it("treats an event without a valid date as not editable instead of failing", () => {
    expect(canChangeTasks({ status: "PUBLISHED", date: undefined as unknown as string, startTime: "18:00:00", endTime: null }, now)).to.equal(false);
    expect(canChangeTasks({ status: "PUBLISHED", date: "not-a-date", startTime: "18:00:00", endTime: null }, now)).to.equal(false);
  });

  it("looks up the member role label by user id", () => {
    const members = [
      { id: 1, firstName: "Maria", lastName: "Ionescu", role: "MANAGER" as const },
      { id: 2, firstName: "Radu", lastName: "Moldovan", role: "MEMBER" as const },
    ];
    expect(memberRoleLabel(members, 1)).to.equal("Manager");
    expect(memberRoleLabel(members, 2)).to.equal("Member");
    expect(memberRoleLabel(members, 99)).to.equal(undefined);
    expect(memberRoleLabel(undefined, 1)).to.equal(undefined);
  });

  it("builds the task request with a trimmed description and an optional assignee", () => {
    expect(toTaskRequest("  Print badges  ", "2")).to.deep.equal({ description: "Print badges", assigneeUserId: 2 });
    expect(toTaskRequest("Print badges", "")).to.deep.equal({ description: "Print badges", assigneeUserId: null });
  });
});
