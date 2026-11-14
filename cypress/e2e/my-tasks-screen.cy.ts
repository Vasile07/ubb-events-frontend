describe("my tasks screen", () => {
  type FetchHandler = (url: string, init?: RequestInit) => Promise<Response>;

  const json = (status: number, body: unknown): Promise<Response> =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      statusText: "",
      json: () => Promise.resolve(body),
    } as Response);

  const profile = {
    id: 7,
    firstName: "Andrei",
    lastName: "Pop",
    email: "andrei.pop@stud.ubbcluj.ro",
    memberships: [
      { organizationId: 1, role: "MEMBER" },
      { organizationId: 2, role: "MEMBER" },
    ],
  };

  const hermes = { id: 1, name: "Societatea Hermes" };
  const photo = { id: 2, name: "Photo Club UBB" };
  const careerFair = { id: 10, title: "Career Fair: Meet Cluj Tech Firms", date: "2026-11-14", startTime: "18:00:00", status: "PUBLISHED" };
  const brunch = { id: 20, title: "Networking Brunch with Alumni", date: "2026-11-22", startTime: "11:00:00", status: "DRAFT" };
  const winter = { id: 30, title: "Winter Case Competition", date: "2026-12-05", startTime: "10:00:00", status: "CANCELED" };

  // Deliberately not in chronological order: the page groups and sorts on the client.
  const myTasks = [
    { id: 105, description: "Photograph the event and share a gallery with organizers within 48 hours.", event: winter, organization: photo },
    { id: 101, description: "Set up the registration desk and print attendee name badges.", event: careerFair, organization: hermes },
    { id: 103, description: "Book catering for 40 people and confirm the menu with the venue.", event: brunch, organization: hermes },
    { id: 102, description: "Welcome and guide company representatives to their booths.", event: careerFair, organization: hermes },
    { id: 106, description: "Prepare the photo-booth backdrop and props.", event: winter, organization: photo },
  ];

  const backend = (tasksResponse: () => Promise<Response>): FetchHandler => (url) => {
    if (url.endsWith("/api/users/me")) return json(200, profile);
    if (url.endsWith("/api/users/me/tasks")) return tasksResponse();
    return json(200, []);
  };

  const visitMyTasks = (handler: FetchHandler) => {
    cy.visit("/my-tasks", {
      onBeforeLoad(win) {
        win.localStorage.clear();
        win.localStorage.setItem("token", "jwt");
        cy.stub(win, "fetch")
          .as("fetch")
          .callsFake((input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init));
      },
    });
  };

  const taskCalls = () =>
    cy.get<sinon.SinonStub>("@fetch").then((stub) =>
      stub.getCalls().filter((call) => String(call.args[0]).endsWith("/api/users/me/tasks")),
    );

  it("renders the header, the computed stats and one card per event in chronological order", () => {
    visitMyTasks(backend(() => json(200, myTasks)));

    cy.get("[data-testid=page-my-tasks]").should("be.visible");
    cy.contains("h1", "My tasks").should("be.visible");
    cy.contains("Tasks assigned to you by event organizers.").should("be.visible");

    cy.get("[data-testid=my-tasks-stat-tasks]").should("contain.text", "5").and("contain.text", "Assigned tasks");
    cy.get("[data-testid=my-tasks-stat-events]").should("contain.text", "3").and("contain.text", "Events involved");
    cy.get("[data-testid=my-tasks-stat-organizations]").should("contain.text", "2").and("contain.text", "Organizations");

    cy.get("[data-testid^=my-task-group-]").should("have.length", 3).then(($groups) => {
      expect([...$groups].map((group) => group.getAttribute("data-testid"))).to.deep.equal([
        "my-task-group-10",
        "my-task-group-20",
        "my-task-group-30",
      ]);
    });

    cy.get("[data-testid=my-task-group-10]").within(() => {
      cy.get("[data-testid=date-block]").should("contain.text", "NOV").and("contain.text", "14");
      cy.contains("h2", "Career Fair: Meet Cluj Tech Firms").should("be.visible");
      cy.contains("Societatea Hermes").should("be.visible");
      cy.contains("Sat, 14 Nov · 18:00").should("be.visible");
      cy.get(".ui-badge").should("have.class", "ui-badge-success").and("contain.text", "Published");
      cy.contains("button", "Open event workspace").should("be.visible");
      cy.get("[data-testid^=my-task-]").then(($tasks) => {
        expect([...$tasks].map((item) => item.textContent?.trim())).to.deep.equal([
          "Set up the registration desk and print attendee name badges.",
          "Welcome and guide company representatives to their booths.",
        ]);
      });
    });

    cy.get("[data-testid=my-task-group-20]").within(() => {
      cy.get(".ui-badge").should("have.class", "ui-badge-warning").and("contain.text", "Draft");
      cy.contains("Sun, 22 Nov · 11:00").should("be.visible");
    });

    cy.get("[data-testid=my-task-group-30]").within(() => {
      cy.get("[data-testid=date-block]").should("contain.text", "DEC").and("contain.text", "05");
      cy.contains("Photo Club UBB").should("be.visible");
      cy.get(".ui-badge").should("have.class", "ui-badge-danger").and("contain.text", "Canceled");
      cy.get("[data-testid^=my-task-]").should("have.length", 2);
    });

    taskCalls().should("have.length", 1);
  });

  it("opens the event workspace of a card", () => {
    visitMyTasks(backend(() => json(200, myTasks)));

    cy.get("[data-testid=my-task-group-20]").contains("button", "Open event workspace").click();

    cy.location("pathname").should("eq", "/org/1/events/20/tasks");
    cy.get("[data-testid=page-org-event-tasks]").should("be.visible");
  });

  it("shows skeleton cards while loading", () => {
    visitMyTasks(backend(() => new Promise<Response>(() => undefined)));

    cy.get("[data-testid=my-tasks-skeleton]").should("be.visible").and("have.attr", "aria-busy", "true");
    cy.get("[data-testid^=my-task-group-]").should("not.exist");
    cy.get("[data-testid=my-tasks-empty]").should("not.exist");
  });

  it("shows the empty state when no tasks are assigned", () => {
    visitMyTasks(backend(() => json(200, [])));

    cy.get("[data-testid=my-tasks-empty]")
      .should("be.visible")
      .and("contain.text", "No tasks assigned yet")
      .and("contain.text", "When an organizer assigns you a task, it will appear here.");
    cy.get("[data-testid=my-tasks-empty] img").should("have.attr", "src", "/ui-assets/feedback-users.svg");
    cy.get("[data-testid=my-tasks-stat-tasks]").should("not.exist");
    cy.get("[data-testid=my-tasks-skeleton]").should("not.exist");
  });

  it("shows the error state and retries", () => {
    let attempts = 0;
    visitMyTasks(
      backend(() => {
        attempts += 1;
        // The query client retries a 5xx once automatically, so the first two attempts fail.
        return attempts <= 2
          ? json(500, { status: 500, message: "Unexpected server error", errors: [] })
          : json(200, myTasks);
      }),
    );

    cy.get("[data-testid=my-tasks-error]", { timeout: 10000 })
      .should("be.visible")
      .and("contain.text", "We couldn’t load your tasks");
    cy.get("[data-testid=my-tasks-retry]").click();

    cy.get("[data-testid^=my-task-group-]").should("have.length", 3);
    cy.get("[data-testid=my-tasks-error]").should("not.exist");
  });
});
