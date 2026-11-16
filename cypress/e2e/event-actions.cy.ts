const profile = { id: 7, firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", memberships: [{ organizationId: 3, role: "MANAGER" }] };
const draft = { id: 42, organizationId: 3, categoryId: 1, title: "Draft event", description: "Details", date: "2099-11-20", startTime: "18:00:00", endTime: "21:30:00", location: "Main hall", capacity: 120, status: "DRAFT", registrationCount: 120 };

function visitEvent(eventBody = draft, extra: { publishStatus?: number; deleteStatus?: number; updateStatus?: number; updateDelayMs?: number } = {}, role: "MEMBER" | "MANAGER" = "MANAGER", path = "/org/3/events/42/tasks") {
  cy.visit(path, { onBeforeLoad(win) {
    win.localStorage.setItem("token", "jwt");
    win.fetch = cy.stub().callsFake((input, init) => {
      const url = new URL(String(input)); const path = url.pathname.replace(/\/+$/, "");
      if (path.endsWith("/api/users/me")) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ...profile, memberships: [{ organizationId: 3, role }] }) } as Response);
      if (path.endsWith("/api/organizations/3")) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ organizationId: 3, name: "Hermes", description: "Business", status: "MEMBER", role }) } as Response);
      if (path.endsWith("/api/organizations/3/events/42") && (!init?.method || init.method === "GET")) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(eventBody) } as Response);
      if (path.endsWith("/api/organizations/3/events/42") && init?.method === "PUT") { const status = extra.updateStatus ?? 200; const result = { ok: status < 400, status, json: () => Promise.resolve(status < 400 ? eventBody : { message: "Capacity is invalid", errors: [{ field: "capacity", message: "Capacity cannot be lower than active registrations" }] }) } as Response; return extra.updateDelayMs ? new Promise((resolve) => win.setTimeout(() => resolve(result), extra.updateDelayMs)) : Promise.resolve(result); }
      if (path.endsWith("/publish")) { const status = extra.publishStatus ?? 200; return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(status < 400 ? { ...eventBody, status: "PUBLISHED" } : { message: "Event is not ready to be published", errors: [{ field: "endTime", message: "End time is required" }] }) } as Response); }
      if (path.endsWith("/events/42") && init?.method === "DELETE") { const status = extra.deleteStatus ?? 204; return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve({ message: "Event has already ended and cannot be deleted" }) } as Response); }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) } as Response);
    }) as typeof fetch;
  }});
}

describe("event manager actions", () => {
  it("renders manager actions and publish validation in its modal", () => {
    visitEvent(draft, { publishStatus: 400 });
    cy.get("[data-testid=event-action-edit]").should("exist");
    cy.get("[data-testid=event-workspace-draft-warning]").should("contain", "This event is a draft. Only your organization can see it. Publish it to open registration.").find("[data-testid=icon-info]").should("exist");
    cy.get("[data-testid=event-action-publish]").click();
    cy.get("[role=dialog]").should("contain", "Publish this event?").and("contain", "Draft event").and("contain", "students").and("contain", "Title").and("contain", "description").and("contain", "location").and("contain", "Start and end date and time are set").and("contain", "Capacity").find("[data-testid=icon-check]").should("have.length", 4);
    cy.get("[role=dialog]").contains("button", "Not yet").should("exist");
    cy.get("[role=dialog]").contains("button", "Publish event").click();
    cy.get("[role=dialog]").should("contain", "End time is required");
  });

  it("opens delete confirmation and reports ended-event rejection", () => {
    visitEvent({ ...draft, status: "PUBLISHED" }, { deleteStatus: 409 });
    cy.get("[data-testid=event-action-delete]").click();
    cy.get("[role=dialog]").should("contain", "Delete this event?").and("contain", "marked canceled").and("contain", "Chat").and("contain", "announcements").and("contain", "120 registered participants will be affected.").find("[data-testid=icon-trash]").should("exist").and("have.length", 1);
    cy.get("[role=dialog] .event-action-impact").should("have.class", "event-action-impact-warning");
    cy.get("[role=dialog]").contains("button", "Keep event").should("exist");
    cy.get("[role=dialog]").contains("button", "Delete event").click();
    cy.get("[role=dialog]").should("contain", "already ended");
  });

  it("submits the edit form with the loaded category and returns with a success toast", () => {
    visitEvent({ ...draft, categoryId: 9, status: "PUBLISHED" }, {}, "MANAGER", "/org/3/events/42/edit");
    cy.get("[data-testid=event-form]").should("be.visible");
    cy.get("[data-testid=event-edit-back]").should("contain", "Back to event");
    cy.get("[data-testid=event-edit-heading-row] h1").should("contain", "Edit event").siblings("[data-testid=event-edit-status]").should("contain", "Published");
    cy.get("[data-testid=event-edit-helper]").should("contain", "Changes are visible to participants right after saving.");
    cy.get("[data-testid=event-edit-published-notice]").should("contain", "Editing a published event").and("contain", "Participants");
    cy.get("[data-testid=current-status-card]").should("contain", "120 / 120").and("contain", "Active registrations");
    cy.get("[data-testid=event-form-cancel]").should("contain", "Cancel");
    cy.get("textarea[name=registrationInformation]").should("be.disabled");
    cy.get("input[name=title]").clear().type("Updated event");
    cy.get("[data-testid=event-form-submit]").click();
    cy.window().then((win) => {
      const put = (win.fetch as unknown as Cypress.SinonStub).getCalls().find((call) => call.args[1]?.method === "PUT");
      expect(put).to.exist;
      expect(JSON.parse(String(put?.args[1]?.body))).to.include({ categoryId: 9, title: "Updated event", date: "2099-11-20" });
      expect((win.fetch as unknown as Cypress.SinonStub).getCalls().filter((call) => new URL(String(call.args[0])).pathname.endsWith("/api/organizations/3/events/42") && (!call.args[1]?.method || call.args[1]?.method === "GET")).length).to.be.greaterThan(1);
    });
    cy.get("[data-testid=toast-success]").should("contain", "Event updated");
    cy.location("pathname").should("eq", "/org/3/events/42/tasks");
  });

  it("hides actions for members and disables edit and publish for terminal events", () => {
    visitEvent(draft, {}, "MEMBER");
    cy.get("[data-testid=event-workspace-actions]").should("be.empty");
    visitEvent({ ...draft, status: "COMPLETED" });
    cy.get("[data-testid=event-action-edit]").should("have.attr", "aria-disabled", "true");
    cy.get("[data-testid=event-action-publish]").should("not.exist");
    visitEvent({ ...draft, status: "CANCELED" });
    cy.get("[data-testid=event-action-edit]").should("have.attr", "aria-disabled", "true");
    cy.get("[data-testid=event-action-publish]").should("not.exist");
  });

  it("shows field errors when edit persistence is rejected", () => {
    visitEvent({ ...draft, categoryId: 4 }, { updateStatus: 400 }, "MANAGER", "/org/3/events/42/edit");
    cy.get("[data-testid=event-form-submit]").click();
    cy.get("[data-testid=event-form-summary]").should("contain", "Capacity cannot be lower");
  });

  it("disables the end date in edit mode and disables submit while saving", () => {
    visitEvent({ ...draft, categoryId: 4 }, { updateDelayMs: 2000 }, "MANAGER", "/org/3/events/42/edit");
    cy.get("input[name=endDate]").should("be.disabled");
    cy.get("[data-testid=event-form-submit]").click();
    cy.get("[data-testid=event-form-submit]").should("be.disabled").and("contain", "Loading");
    cy.get("[data-testid=toast-success]").should("contain", "Event updated");
  });

  it("publishes successfully, refetches the active event, and shows a success toast", () => {
    visitEvent(draft, {}, "MANAGER");
    cy.get("[data-testid=event-action-publish]").click();
    cy.get("[role=dialog]").contains("button", "Publish event").click();
    cy.get("[data-testid=toast-success]").should("contain", "Event published");
    cy.window().then((win) => {
      const calls = (win.fetch as unknown as Cypress.SinonStub).getCalls();
      expect(calls.some((call) => new URL(String(call.args[0])).pathname.endsWith("/events/42/publish") && call.args[1]?.method === "PATCH")).to.equal(true);
      expect(calls.filter((call) => new URL(String(call.args[0])).pathname.endsWith("/api/organizations/3/events/42") && (!call.args[1]?.method || call.args[1]?.method === "GET")).length).to.be.greaterThan(1);
    });
  });

  it("deletes successfully, navigates to the organization events list, and refetches it", () => {
    visitEvent({ ...draft, status: "PUBLISHED" });
    cy.get("[data-testid=event-action-delete]").click();
    cy.get("[role=dialog]").contains("button", "Delete event").click();
    cy.get("[data-testid=toast-success]").should("contain", "Event deleted");
    cy.location("pathname").should("eq", "/org/3/events");
    cy.window().then((win) => {
      const calls = (win.fetch as unknown as Cypress.SinonStub).getCalls();
      expect(calls.some((call) => new URL(String(call.args[0])).pathname.endsWith("/api/organizations/3/events") && (!call.args[1]?.method || call.args[1]?.method === "GET"))).to.equal(true);
    });
  });
});
