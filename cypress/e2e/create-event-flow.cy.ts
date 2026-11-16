describe("create event flow", () => {
  const visitAsManager = (error = false) => {
    cy.visit(`/org/3/events/new${error ? "?error=1" : ""}`, {
      onBeforeLoad(win) {
        win.localStorage.setItem("token", "jwt");
        cy.stub(win, "fetch").callsFake((input, init) => {
          const url = String(input);
          if (url.endsWith("/api/users/me")) {
            return Promise.resolve(new Response(JSON.stringify({
              id: 7,
              firstName: "Ada",
              lastName: "Lovelace",
              email: "ada@example.com",
              memberships: [{ organizationId: 3, role: "MANAGER" }],
            }), { status: 200, headers: { "Content-Type": "application/json" } }));
          }
          if (url.includes("/api/organizations/3/members")) {
            return Promise.resolve(new Response(JSON.stringify([{ id: 7, fullName: "Ada Lovelace" }]), { status: 200, headers: { "Content-Type": "application/json" } }));
          }
          if (url.endsWith("/api/organizations/3/events") && init?.method === "POST") {
            (win as Window & { __createBody?: unknown }).__createBody = JSON.parse(String(init.body));
            if (win.location.search.includes("error=1")) {
              return Promise.resolve(new Response(JSON.stringify({ message: "Validation failed", errors: [
                { field: "title", message: "Title already exists" },
                { field: "tasks[0].description", message: "Task description is required" },
              ] }), { status: 400, headers: { "Content-Type": "application/json" } }));
            }
            return Promise.resolve(new Response(JSON.stringify({ id: 42, status: "DRAFT" }), { status: 201, headers: { "Content-Type": "application/json" } }));
          }
          return Promise.resolve(new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } }));
        });
      },
    });
  };

  it("renders the manager create form and submits one atomic draft request", () => {
    visitAsManager();
    cy.get('[data-testid="event-form"]').should("be.visible");
    cy.get('[name="title"]').type("Campus night");
    cy.get('[name="description"]').type("A student event");
    cy.get('[name="location"]').type("Main hall");
    cy.get('[name="startDate"]').type("2026-12-01");
    cy.get('[name="startTime"]').type("18:00");
    cy.get('[name="endDate"]').type("2026-12-01");
    cy.get('[name="endTime"]').type("20:00");
    cy.get('[name="capacity"]').clear().type("60");
    cy.get('[name="tasks[0].description"]').type("Prepare room");
    cy.get('[name="tasks[0].assigneeId"]').select("7");
    cy.get('[data-testid="event-form-submit"]').click();
    cy.window().its("__createBody").should("deep.equal", {
      title: "Campus night",
      description: "A student event",
      date: "2026-12-01",
      startTime: "18:00",
      endTime: "20:00",
      location: "Main hall",
      capacity: 60,
      tasks: [{ description: "Prepare room", assigneeId: 7 }],
    });
    cy.location("pathname").should("eq", "/org/3/events/42/tasks");
    cy.get('[data-testid="toast-success"]').should("contain", "draft");
  });

  it("keeps entered values and maps atomic backend field errors", () => {
    visitAsManager(true);
    cy.get('[name="title"]').type("Keep this title");
    cy.get('[name="description"]').type("A student event");
    cy.get('[name="location"]').type("Main hall");
    cy.get('[name="startDate"]').type("2026-12-01");
    cy.get('[name="startTime"]').type("18:00");
    cy.get('[name="endDate"]').type("2026-12-01");
    cy.get('[name="endTime"]').type("20:00");
    cy.get('[data-testid="event-form-submit"]').click();
    cy.get('[name="title"]').should("have.value", "Keep this title");
    cy.get('[data-testid="event-form-summary"]').should("contain", "Title already exists");
    cy.get('[name="tasks[0].description"]').siblings(".ui-field-message-error").should("contain", "Task description is required");
  });

  it("confirms before canceling a dirty draft", () => {
    visitAsManager();
    cy.get('[name="title"]').type("Unsaved draft");
    cy.contains("button", "Cancel").click();
    cy.get('[role="dialog"]').should("be.visible").and("contain", "Discard event draft?");
    cy.contains("button", "Keep editing").click();
    cy.get('[name="title"]').should("have.value", "Unsaved draft");
  });

  it("treats task add/remove as dirty and focuses the dialog with Escape support", () => {
    visitAsManager();
    cy.get('[data-testid="add-task"]').click();
    cy.contains("button", "Cancel").click();
    cy.get('[role="dialog"]').should("be.visible");
    cy.focused().should("contain", "Keep editing");
    cy.get("body").type("{esc}");
    cy.get('[role="dialog"]').should("not.exist");

    cy.get('[data-testid="task-row"]:first').within(() => cy.contains("button", "Remove").click());
    cy.contains("button", "Cancel").click();
    cy.get('[role="dialog"]').should("be.visible");
  });
});
