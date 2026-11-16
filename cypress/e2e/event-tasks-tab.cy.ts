describe("event tasks tab", () => {
  type FetchHandler = (url: string, init?: RequestInit) => Promise<Response> | undefined;
  type Task = { id: number; description: string; assignee: { id: number; firstName: string; lastName: string } | null };

  const json = (status: number, body: unknown): Promise<Response> =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      statusText: "",
      json: () => Promise.resolve(body),
    } as Response);

  const ORG = "/api/organizations/3";
  const TASKS = `${ORG}/events/9/tasks`;
  const members = [
    { id: 1, firstName: "Maria", lastName: "Ionescu", email: "maria@ubb.ro", role: "MANAGER" },
    { id: 2, firstName: "Radu", lastName: "Moldovan", email: "radu@ubb.ro", role: "MEMBER" },
    { id: 7, firstName: "Andrei", lastName: "Pop", email: "andrei@ubb.ro", role: "MANAGER" },
  ];
  const upcomingEvent = {
    id: 9, organizationId: 3, categoryId: 1, title: "Career Fair: Meet Cluj Tech Firms", description: "Fair",
    date: "2099-11-14", startTime: "18:00:00", endTime: "21:00:00", location: "Aula Magna", capacity: 60,
    status: "PUBLISHED", registrationCount: 0,
  };

  const initialTasks = (): Task[] => [
    { id: 101, description: "Set up the registration desk and print attendee name badges.", assignee: { id: 2, firstName: "Radu", lastName: "Moldovan" } },
    { id: 102, description: "Coordinate the photographer and the stage schedule.", assignee: { id: 1, firstName: "Maria", lastName: "Ionescu" } },
    { id: 103, description: "Prepare the thank-you email.", assignee: null },
  ];

  let tasks: Task[];
  let calls: { method: string; url: string; body: unknown }[];

  const visitTasks = (
    options: { role?: "MANAGER" | "MEMBER"; event?: Record<string, unknown>; handler?: FetchHandler } = {},
  ) => {
    const { role = "MANAGER", event = upcomingEvent, handler } = options;
    cy.visit("/org/3/events/9/tasks", {
      onBeforeLoad(win) {
        win.localStorage.clear();
        win.localStorage.setItem("token", "jwt");
        cy.stub(win, "fetch").callsFake((input: RequestInfo | URL, init?: RequestInit) => {
          const url = String(input);
          const method = init?.method ?? "GET";
          calls.push({ method, url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
          const custom = handler?.(url, init);
          if (custom) return custom;
          if (url.endsWith("/api/users/me")) {
            return json(200, { id: 7, firstName: "Andrei", lastName: "Pop", email: "a@b.ro", memberships: [{ organizationId: 3, role }] });
          }
          if (url.endsWith(ORG)) return json(200, { organizationId: 3, name: "Societatea Hermes", description: null, role, status: role });
          if (url.endsWith(`${ORG}/events/9`)) return json(200, event);
          if (url.endsWith(`${ORG}/members`)) return json(200, members);
          if (url.endsWith(TASKS) && method === "GET") return json(200, tasks);
          return json(200, []);
        });
      },
    });
  };

  const callsTo = (method: string, suffix: string) => calls.filter((call) => call.method === method && call.url.endsWith(suffix));

  beforeEach(() => {
    tasks = initialTasks();
    calls = [];
  });

  it("renders the header and the task table with assignees for a manager", () => {
    visitTasks();

    cy.get("[data-testid=page-org-event-tasks]").should("be.visible");
    cy.contains("h2", "Event tasks").should("be.visible");
    cy.contains("Only visible to organization members, never shown on the public event page.").should("be.visible");
    cy.get("[data-testid=event-tasks-add]").should("contain.text", "Add task").and("have.class", "ui-button-primary");
    cy.get("th").then(($th) => {
      expect([...$th].map((th) => th.textContent?.trim())).to.deep.equal(["Task", "Assigned to", ""]);
    });

    cy.get("[data-testid=event-task-row-101]").within(() => {
      cy.contains("Set up the registration desk and print attendee name badges.").should("be.visible");
      cy.get(".ui-avatar").should("have.text", "RM");
      cy.contains("Radu Moldovan").should("be.visible");
      cy.contains("Member").should("be.visible");
      cy.get("[data-testid=event-task-edit-101]").should("contain.text", "Edit").and("have.class", "ui-button-ghost");
    });
    cy.get("[data-testid=event-task-row-102]").should("contain.text", "Maria Ionescu").and("contain.text", "Manager");
    cy.get("[data-testid=event-task-row-103]").within(() => {
      cy.contains("Unassigned").should("be.visible");
      cy.get(".ui-avatar").should("not.exist");
    });
  });

  it("shows the list read-only for a member", () => {
    visitTasks({ role: "MEMBER" });

    cy.get("[data-testid=event-task-row-101]").should("be.visible");
    cy.get("[data-testid=event-tasks-add]").should("not.exist");
    cy.get("[data-testid^=event-task-edit-]").should("not.exist");
    cy.get("th").should("have.length", 2);
  });

  it("adds a task through the modal", () => {
    visitTasks({
      handler: (url, init) => {
        if (url.endsWith(TASKS) && init?.method === "POST") {
          const created = { id: 104, description: "Order snacks", assignee: { id: 2, firstName: "Radu", lastName: "Moldovan" } };
          tasks = [...tasks, created];
          return json(201, created);
        }
        return undefined;
      },
    });

    cy.get("[data-testid=event-tasks-add]").click();
    cy.get("[role=dialog]").should("be.visible").and("contain.text", "Add task");
    cy.get("[data-testid=event-task-assignee] option").then(($options) => {
      expect([...$options].map((option) => option.textContent)).to.deep.equal([
        "Unassigned",
        "Maria Ionescu · Manager",
        "Radu Moldovan · Member",
        "Andrei Pop · Manager",
      ]);
    });
    cy.get("[data-testid=event-task-description]").type("  Order snacks  ");
    cy.get("[data-testid=event-task-assignee]").select("Radu Moldovan · Member");
    cy.get("[data-testid=event-task-save]").click();

    cy.wrap(null).should(() => {
      const posts = callsTo("POST", TASKS);
      expect(posts).to.have.length(1);
      expect(posts[0].body).to.deep.equal({ description: "Order snacks", assigneeUserId: 2 });
    });
    cy.get("[role=dialog]").should("not.exist");
    cy.get("[data-testid=toast-success]").should("contain.text", "Task added");
    cy.get("[data-testid=event-task-row-104]").should("contain.text", "Order snacks");
  });

  it("requires a description before calling the API", () => {
    visitTasks();

    cy.get("[data-testid=event-tasks-add]").click();
    cy.get("[data-testid=event-task-description]").type("   ");
    cy.get("[data-testid=event-task-save]").click();

    cy.get("[role=dialog]").should("contain.text", "Task description is required");
    cy.get("[data-testid=event-task-description]").should("have.attr", "aria-invalid", "true");
    cy.wrap(null).should(() => expect(callsTo("POST", TASKS)).to.have.length(0));
  });

  it("maps backend field errors onto the modal fields", () => {
    visitTasks({
      handler: (url, init) =>
        url.endsWith(TASKS) && init?.method === "POST"
          ? json(400, {
              status: 400,
              message: "Task details are invalid",
              errors: [{ field: "assigneeUserId", message: "Assignee must be an active member of the organization" }],
            })
          : undefined,
    });

    cy.get("[data-testid=event-tasks-add]").click();
    cy.get("[data-testid=event-task-description]").type("Order snacks");
    cy.get("[data-testid=event-task-assignee]").select("Radu Moldovan · Member");
    cy.get("[data-testid=event-task-save]").click();

    cy.get("[role=dialog]").should("contain.text", "Assignee must be an active member of the organization");
    cy.get("[data-testid=event-task-assignee]").should("have.attr", "aria-invalid", "true");
  });

  it("edits, reassigns and unassigns a task", () => {
    visitTasks({
      handler: (url, init) => {
        if (url.endsWith(`${TASKS}/101`) && init?.method === "PUT") {
          const body = JSON.parse(String(init.body)) as { description: string; assigneeUserId: number | null };
          const assignee = members.find((member) => member.id === body.assigneeUserId) ?? null;
          const updated = {
            id: 101,
            description: body.description,
            assignee: assignee && { id: assignee.id, firstName: assignee.firstName, lastName: assignee.lastName },
          };
          tasks = tasks.map((task) => (task.id === 101 ? updated : task));
          return json(200, updated);
        }
        return undefined;
      },
    });

    cy.get("[data-testid=event-task-edit-101]").click();
    cy.get("[role=dialog]").should("contain.text", "Edit task");
    cy.get("[data-testid=event-task-description]").should("have.value", "Set up the registration desk and print attendee name badges.");
    cy.get("[data-testid=event-task-assignee]").should("have.value", "2");
    cy.get("[data-testid=event-task-description]").clear().type("Set up the desk");
    cy.get("[data-testid=event-task-assignee]").select("Maria Ionescu · Manager");
    cy.get("[data-testid=event-task-save]").click();

    cy.get("[data-testid=toast-success]").should("contain.text", "Task updated");
    cy.get("[data-testid=event-task-row-101]").should("contain.text", "Set up the desk").and("contain.text", "Maria Ionescu");

    cy.get("[data-testid=event-task-edit-101]").click();
    cy.get("[data-testid=event-task-assignee]").select("Unassigned");
    cy.get("[data-testid=event-task-save]").click();
    cy.get("[data-testid=event-task-row-101]").should("contain.text", "Unassigned");

    cy.wrap(null).should(() => {
      const puts = callsTo("PUT", `${TASKS}/101`);
      expect(puts).to.have.length(2);
      expect(puts[0].body).to.deep.equal({ description: "Set up the desk", assigneeUserId: 1 });
      expect(puts[1].body).to.deep.equal({ description: "Set up the desk", assigneeUserId: null });
    });
  });

  it("removes a task after confirmation", () => {
    visitTasks({
      handler: (url, init) => {
        if (url.endsWith(`${TASKS}/102`) && init?.method === "DELETE") {
          tasks = tasks.filter((task) => task.id !== 102);
          return json(204, undefined);
        }
        return undefined;
      },
    });

    cy.get("[data-testid=event-task-edit-102]").click();
    cy.get("[data-testid=event-task-remove]").click();
    cy.get("[role=dialog]").should("contain.text", "Remove this task? This can't be undone.");
    cy.wrap(null).should(() => expect(callsTo("DELETE", `${TASKS}/102`)).to.have.length(0));
    cy.get("[data-testid=event-task-confirm-remove]").click();

    cy.get("[data-testid=toast-success]").should("contain.text", "Task removed");
    cy.get("[data-testid=event-task-row-102]").should("not.exist");
    cy.wrap(null).should(() => expect(callsTo("DELETE", `${TASKS}/102`)).to.have.length(1));
  });

  it("shows a toast and refreshes when the backend refuses the change", () => {
    visitTasks({
      handler: (url, init) =>
        url.endsWith(TASKS) && init?.method === "POST"
          ? json(409, { status: 409, message: "Tasks of an ended event cannot be changed", errors: [] })
          : undefined,
    });

    cy.get("[data-testid=event-tasks-add]").click();
    cy.get("[data-testid=event-task-description]").type("Order snacks");
    cy.get("[data-testid=event-task-save]").click();

    cy.get("[data-testid=toast-error]").should("contain.text", "Tasks of an ended event cannot be changed");
    cy.get("[role=dialog]").should("not.exist");
    cy.wrap(null).should(() => {
      expect(calls.filter((call) => call.method === "GET" && call.url.endsWith(TASKS)).length).to.be.greaterThan(1);
    });
  });

  it("hides changes and explains why for an ended event", () => {
    visitTasks({ event: { ...upcomingEvent, date: "2020-01-10" } });

    cy.get("[data-testid=event-task-row-101]").should("be.visible");
    cy.get("[data-testid=event-tasks-ended]").should("contain.text", "This event has ended, so its tasks can no longer be changed.");
    cy.get("[data-testid=event-tasks-add]").should("not.exist");
    cy.get("[data-testid^=event-task-edit-]").should("not.exist");
  });

  it("hides changes for a canceled event", () => {
    visitTasks({ event: { ...upcomingEvent, status: "CANCELED" } });

    cy.get("[data-testid=event-task-row-101]").should("be.visible");
    cy.get("[data-testid=event-workspace-canceled]").should("be.visible");
    cy.get("[data-testid=event-tasks-add]").should("not.exist");
    cy.get("[data-testid^=event-task-edit-]").should("not.exist");
    cy.get("[data-testid=event-tasks-ended]").should("not.exist");
  });

  it("shows the table skeleton while loading", () => {
    visitTasks({ handler: (url, init) => (url.endsWith(TASKS) && (init?.method ?? "GET") === "GET" ? new Promise<Response>(() => undefined) : undefined) });

    cy.get("[data-testid=page-org-event-tasks] [data-testid=table-skeleton]").should("be.visible");
  });

  it("shows the empty state with Add task for a manager and without it for a member", () => {
    tasks = [];
    visitTasks();
    cy.get("[data-testid=event-tasks-empty]").should("contain.text", "No tasks yet").and("contain.text", "Add the first task for this event.");
    cy.get("[data-testid=event-tasks-empty] [data-testid=empty-state-action]").should("contain.text", "Add task").click();
    cy.get("[role=dialog]").should("contain.text", "Add task");

    visitTasks({ role: "MEMBER" });
    cy.get("[data-testid=event-tasks-empty]").should("contain.text", "No tasks have been added to this event yet.");
    cy.get("[data-testid=event-tasks-empty] [data-testid=empty-state-action]").should("not.exist");
  });

  it("shows the error state and retries", () => {
    let attempts = 0;
    visitTasks({
      handler: (url, init) => {
        if (url.endsWith(TASKS) && (init?.method ?? "GET") === "GET") {
          attempts += 1;
          // The query client retries a 5xx once automatically, so the first two attempts fail.
          return attempts <= 2 ? json(500, { status: 500, message: "Unexpected", errors: [] }) : json(200, tasks);
        }
        return undefined;
      },
    });

    cy.get("[data-testid=event-tasks-error]", { timeout: 10000 }).should("contain.text", "We couldn’t load the tasks");
    cy.get("[data-testid=event-tasks-retry]").click();
    cy.get("[data-testid=event-task-row-101]").should("be.visible");
  });
});
