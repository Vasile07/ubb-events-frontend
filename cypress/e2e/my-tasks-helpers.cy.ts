import {
  eventStatusBadge,
  formatTaskEventDate,
  groupTasksByEvent,
  summarizeTasks,
} from "../../src/features/tasks/myTasks";
import type { MyTask } from "../../src/features/tasks/types";

// Unit tests for the pure My tasks helpers (no browser page needed).
describe("my tasks helpers", () => {
  const hermes = { id: 1, name: "Societatea Hermes" };
  const photo = { id: 2, name: "Photo Club UBB" };

  const task = (
    id: number,
    event: Partial<MyTask["event"]> & { id: number },
    organization = hermes,
  ): MyTask => ({
    id,
    description: `Task ${id}`,
    event: {
      title: `Event ${event.id}`,
      date: "2026-11-14",
      startTime: "18:00:00",
      status: "PUBLISHED",
      ...event,
    },
    organization,
  });

  it("groups tasks by event, sorted by event date then start time", () => {
    const tasks = [
      task(1, { id: 30, date: "2026-12-05", startTime: "10:00:00" }, photo),
      task(2, { id: 10, date: "2026-11-14", startTime: "18:00:00" }),
      task(3, { id: 20, date: "2026-11-14", startTime: "09:00:00" }),
      task(4, { id: 10, date: "2026-11-14", startTime: "18:00:00" }),
    ];

    const groups = groupTasksByEvent(tasks);

    expect(groups.map((group) => group.event.id)).to.deep.equal([20, 10, 30]);
    expect(groups[2].organization).to.deep.equal(photo);
    expect(groups[1].tasks.map((item) => item.id)).to.deep.equal([2, 4]);
  });

  it("keeps the backend task order inside a group and orders same-time events by id", () => {
    const tasks = [
      task(9, { id: 5 }),
      task(3, { id: 4 }),
      task(7, { id: 5 }),
      task(1, { id: 5 }),
    ];

    const groups = groupTasksByEvent(tasks);

    expect(groups.map((group) => group.event.id)).to.deep.equal([4, 5]);
    expect(groups[1].tasks.map((item) => item.id)).to.deep.equal([9, 7, 1]);
  });

  it("counts tasks, distinct events and distinct organizations", () => {
    const tasks = [
      task(1, { id: 10 }),
      task(2, { id: 10 }),
      task(3, { id: 20 }),
      task(4, { id: 30 }, photo),
      task(5, { id: 30 }, photo),
    ];

    expect(summarizeTasks(tasks)).to.deep.equal({ tasks: 5, events: 3, organizations: 2 });
    expect(summarizeTasks([])).to.deep.equal({ tasks: 0, events: 0, organizations: 0 });
  });

  it("formats the date block and meta label from the local date and time, without a timezone shift", () => {
    expect(formatTaskEventDate("2026-11-14", "18:00:00")).to.deep.equal({
      month: "NOV",
      day: "14",
      label: "Sat, 14 Nov · 18:00",
    });
    expect(formatTaskEventDate("2026-12-05", "10:00")).to.deep.equal({
      month: "DEC",
      day: "05",
      label: "Sat, 5 Dec · 10:00",
    });
    expect(formatTaskEventDate("2026-11-22", "00:30:00").label).to.equal("Sun, 22 Nov · 00:30");
  });

  it("maps event statuses to badges", () => {
    expect(eventStatusBadge("PUBLISHED")).to.deep.equal({ label: "Published", tone: "Success" });
    expect(eventStatusBadge("DRAFT")).to.deep.equal({ label: "Draft", tone: "Warning" });
    expect(eventStatusBadge("CANCELED")).to.deep.equal({ label: "Canceled", tone: "Danger" });
  });
});
