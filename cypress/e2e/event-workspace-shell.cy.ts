const profile = {
  id: 7,
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  memberships: [{ organizationId: 3, role: "MEMBER" }],
};

const event = {
  id: 42,
  organizationId: 3,
  categoryId: 1,
  title: "Campus night",
  description: "An evening event",
  date: "2026-11-20",
  startTime: "18:00:00",
  endTime: "21:30:00",
  location: "Main hall",
  capacity: 120,
  status: "PUBLISHED",
};

function visitEvent(
  path: string,
  eventBody = event,
  eventStatus = 200,
  role: "MEMBER" | "MANAGER" = "MEMBER",
  options: { delayEventMs?: number; failEventRequests?: number } = {},
) {
  let eventRequests = 0;
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem("token", "jwt");
      win.fetch = cy.stub().callsFake((input) => {
        const url = new URL(String(input));
        const path = url.pathname.replace(/\/+$/, "");
        if (path.endsWith("/api/users/me")) {
          return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ...profile, memberships: [{ organizationId: 3, role }] }) } as Response);
        }
        if (path.endsWith("/api/organizations/3")) {
          return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ organizationId: 3, name: "Hermes", description: "Business", status: "MEMBER", role: "MEMBER" }) } as Response);
        }
        if (path.endsWith("/api/organizations/3/events/42")) {
          eventRequests += 1;
          const status = eventRequests <= (options.failEventRequests ?? 0) ? 503 : eventStatus;
          const body = status >= 400 ? { message: "Unavailable" } : eventBody;
          const result = { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as Response;
          return options.delayEventMs && eventRequests === 1
            ? new Promise((resolve) => win.setTimeout(() => resolve(result), options.delayEventMs))
            : Promise.resolve(result);
        }
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) } as Response);
      }) as typeof fetch;
    },
  });
}

describe("event workspace shell", () => {
  it("renders the shared header and nested tabs", () => {
    visitEvent("/org/3/events/42/tasks");
    cy.get("[data-testid=event-workspace]").should("be.visible");
    cy.get("[data-testid=event-workspace-title]").should("contain", "Campus night");
    cy.get("[data-testid=event-workspace-status]").should("contain", "Published");
    cy.get("[data-testid=event-workspace-location]").should("contain", "Main hall");
    cy.get(".event-workspace-meta").should("contain", "20 Nov 2026").and("contain", "18:00 – 21:30").and("contain", "120 places");
    cy.window().then((win) => {
      const fetchStub = win.fetch as unknown as Cypress.SinonStub;
      expect(fetchStub.getCalls().some((call) => new URL(String(call.args[0])).pathname.replace(/\/+$/, "").endsWith("/api/organizations/3/events/42"))).to.equal(true);
    });
    cy.get("[data-testid=event-workspace-tabs] a").should("have.length", 5);
    const expectedTabs = [
      ["tasks", "/org/3/events/42/tasks"],
      ["registrations", "/org/3/events/42/registrations"],
      ["chat", "/org/3/events/42/chat"],
      ["announcements", "/org/3/events/42/announcements"],
      ["follow-up", "/org/3/events/42/follow-up"],
    ];
    expectedTabs.forEach(([key, href]) => cy.get(`[data-testid=event-workspace-tab-${key}]`).should("have.attr", "href", href));
    cy.get("[data-testid=event-workspace-tab-tasks]").should("have.attr", "aria-current", "page");
    cy.get("nav[aria-label='Event navigation']").should("be.visible");
    cy.get("[data-testid=event-workspace-tab-tasks]").focus().should("have.focus");
    cy.viewport(375, 812);
    cy.get("[data-testid=event-workspace-tabs]").should(($tabs) => expect($tabs[0].scrollWidth).to.be.greaterThan($tabs[0].clientWidth));
  });

  it("shows canceled read-only state and keeps completed follow-up enabled", () => {
    visitEvent("/org/3/events/42/tasks", { ...event, status: "CANCELED" });
    cy.get("[data-testid=event-workspace-canceled]").should("be.visible");
    cy.get("[data-testid=event-workspace-actions]").should("be.empty");

    visitEvent("/org/3/events/42/follow-up", { ...event, status: "COMPLETED" }, 200, "MANAGER");
    cy.get("[data-testid=event-workspace-tab-follow-up]").should("have.attr", "href", "/org/3/events/42/follow-up").and("have.attr", "aria-current", "page");
  });

  it("renders the event loading state", () => {
    visitEvent("/org/3/events/42/tasks", event, 200, "MEMBER", { delayEventMs: 500 });
    cy.get("[data-testid=event-workspace-loading]").should("be.visible").and("have.attr", "aria-busy", "true");
  });

  it("shows a retryable event error and recovers on retry", () => {
    visitEvent("/org/3/events/42/tasks", event, 200, "MEMBER", { failEventRequests: 2 });
    cy.get("[data-testid=event-workspace-error]").should("be.visible");
    cy.contains("button", "Retry").click();
    cy.get("[data-testid=event-workspace-title]").should("contain", "Campus night");
  });

  it("shows not-found for an organization-scoped 404 and invalid event ids", () => {
    visitEvent("/org/3/events/42/tasks", event, 404);
    cy.get("[data-testid=event-workspace-not-found]").should("be.visible");

    visitEvent("/org/3/events/not-a-number/tasks");
    cy.get("[data-testid=event-workspace-not-found]").should("be.visible");
    cy.window().then((win) => {
      const fetchStub = win.fetch as unknown as Cypress.SinonStub;
      expect(fetchStub.getCalls().some((call) => String(call.args[0]).includes("/api/organizations/3/events/"))).to.equal(false);
    });
  });
});
