const profile = { id: 7, firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", memberships: [{ organizationId: 3, role: "MEMBER" }] };
const event = { id: 42, organizationId: 3, categoryId: 1, title: "Campus night", description: "An evening event", date: "2026-11-20", startTime: "18:00:00", endTime: "21:30:00", location: "Main hall", capacity: 120, registrationCount: 2, status: "PUBLISHED" };
const registrations = [
  { firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" },
  { firstName: "Grace", lastName: "Hopper", email: "grace@example.com" },
];

function visitRegistrations(options: { registrations?: typeof registrations; registrationStatus?: number; delayMs?: number; eventStatus?: number } = {}) {
  let registrationRequests = 0;
  cy.visit("/org/3/events/42/registrations", {
    onBeforeLoad(win) {
      win.localStorage.setItem("token", "jwt");
      win.fetch = cy.stub().callsFake((input) => {
        const path = new URL(String(input)).pathname.replace(/\/+$/, "");
        if (path.endsWith("/api/users/me")) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(profile) } as Response);
        if (path.endsWith("/api/organizations/3")) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ organizationId: 3, name: "Hermes", description: "Business", status: "MEMBER", role: "MEMBER" }) } as Response);
        if (path.endsWith("/api/organizations/3/events/42/registrations")) {
          registrationRequests += 1;
          const status = options.registrationStatus ?? 200;
          const result = { ok: status < 400, status, json: () => Promise.resolve(status < 400 ? (options.registrations ?? registrations) : { message: "Unavailable" }) } as Response;
          return options.delayMs && registrationRequests === 1 ? new Promise((resolve) => win.setTimeout(() => resolve(result), options.delayMs)) : Promise.resolve(result);
        }
        if (path.endsWith("/api/organizations/3/events/42")) {
          const status = options.eventStatus ?? 200;
          return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(status < 400 ? event : { message: "Unavailable" }) } as Response);
        }
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) } as Response);
      }) as typeof fetch;
    },
  });
}

describe("event registrations tab", () => {
  it("renders stats, participants, search, and omits unavailable timestamp", () => {
    visitRegistrations();
    cy.get("[data-testid=page-org-event-registrations]").should("be.visible");
    cy.contains("Active registrations").parent().should("contain", "2 / 120");
    cy.contains("Places remaining").parent().should("contain", "118");
    cy.get("[data-testid=event-registrations-table]").should("contain", "Ada Lovelace").and("contain", "ada@example.com").and("contain", "Grace Hopper");
    cy.get("[data-testid=event-registrations-table] th").should("not.contain", "Registered at");
    cy.get("input[placeholder='Search by name or email']").type("grace@");
    cy.get("[data-testid=event-registration-row]").should("have.length", 1).and("contain", "Grace Hopper");
  });

  it("shows empty, loading, retryable error, and forbidden states", () => {
    visitRegistrations({ registrations: [] });
    cy.get("[data-testid=event-registrations-empty]").should("contain", "No registrations yet").find("img[alt='']").should("exist");

    visitRegistrations({ delayMs: 500 });
    cy.get("[data-testid=event-registrations-loading]").should("have.attr", "aria-busy", "true");

    let attempts = 0;
    visitRegistrations({ registrationStatus: 503 });
    cy.get("[data-testid=event-registrations-error]").should("be.visible");
    cy.get("[data-testid=event-registrations-retry]").click();
    cy.get("[data-testid=event-registrations-error]").should("be.visible");
    void attempts;

    visitRegistrations({ registrationStatus: 403 });
    cy.get("[data-testid=page-forbidden]").should("be.visible");
  });
});
