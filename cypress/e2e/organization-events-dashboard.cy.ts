type Membership = { organizationId: number; role: "MEMBER" | "MANAGER" };

type OrganizationEvent = {
  id: number;
  organizationId: number;
  categoryId: number;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string | null;
  location: string | null;
  capacity: number | null;
  registrationCount: number;
  status: "DRAFT" | "PUBLISHED" | "COMPLETED" | "CANCELED";
};

const events: OrganizationEvent[] = [
  {
    id: 11,
    organizationId: 3,
    categoryId: 2,
    title: "Draft Conference",
    description: "Planning in progress",
    date: "2026-11-15",
    startTime: "18:00:00",
    endTime: "20:00:00",
    location: "Aula Magna",
    capacity: 100,
    registrationCount: 0,
    status: "DRAFT",
  },
  {
    id: 12,
    organizationId: 3,
    categoryId: 2,
    title: "Career Fair",
    description: "Meet Cluj tech firms",
    date: "2026-11-14",
    startTime: "18:00:00",
    endTime: "20:00:00",
    location: "Aula Magna",
    capacity: 60,
    registrationCount: 42,
    status: "PUBLISHED",
  },
  {
    id: 13,
    organizationId: 3,
    categoryId: 2,
    title: "Welcome Party",
    description: "A completed event",
    date: "2026-10-03",
    startTime: "21:00:00",
    endTime: "23:00:00",
    location: "Club Form Space",
    capacity: 100,
    registrationCount: 96,
    status: "COMPLETED",
  },
  {
    id: 14,
    organizationId: 3,
    categoryId: 2,
    title: "Canceled Bootcamp",
    description: "Canceled event",
    date: "2026-10-07",
    startTime: "09:00:00",
    endTime: null,
    location: "Room 3, FSEGA",
    capacity: 40,
    registrationCount: 0,
    status: "CANCELED",
  },
];

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 400 ? "Server error" : "OK",
    json: () => Promise.resolve(body),
  } as Response;
}

function visitDashboard(
  role: Membership["role"],
  options: {
    events?: OrganizationEvent[];
    eventsStatus?: number;
    delayEventsMs?: number;
    failEventRequests?: number;
  } = {},
) {
  let eventRequests = 0;
  cy.visit("/org/3/events", {
    onBeforeLoad(win) {
      win.localStorage.setItem("token", "jwt");
      win.fetch = cy.stub().callsFake((input) => {
        const url = new URL(String(input));
        if (url.pathname === "/api/users/me") {
          return Promise.resolve(jsonResponse({
            id: 7,
            firstName: "Ada",
            lastName: "Lovelace",
            email: "ada@example.com",
            memberships: [{ organizationId: 3, role }],
          }));
        }
        if (url.pathname === "/api/organizations/3") {
          return Promise.resolve(jsonResponse({
            organizationId: 3,
            name: "Societatea Hermes",
            description: "A student organization",
            status: "MEMBER",
            role,
          }));
        }
        if (url.pathname === "/api/organizations/3/membership-requests") {
          return Promise.resolve(jsonResponse([]));
        }
        if (url.pathname === "/api/organizations/3/events") {
          eventRequests += 1;
          if (eventRequests <= (options.failEventRequests ?? 0)) {
            return Promise.resolve(jsonResponse({ message: "Unavailable" }, 503));
          }
          const result = jsonResponse(options.events ?? events, options.eventsStatus ?? 200);
          return options.delayEventsMs
            ? new Promise((resolve) => win.setTimeout(() => resolve(result), options.delayEventsMs))
            : Promise.resolve(result);
        }
        return Promise.resolve(jsonResponse([]));
      }) as typeof fetch;
    },
  });
}

describe("organization events dashboard", () => {
  it("loads the organization list and renders counts, event details, and the expected row actions", () => {
    visitDashboard("MANAGER");

    cy.get("[data-testid=page-org-events]").should("be.visible");
    cy.get("[data-testid=organization-events-tabs]").within(() => {
      cy.contains('[role="tab"]', "All · 4").should("have.attr", "aria-selected", "true");
      cy.contains('[role="tab"]', "Drafts · 1");
      cy.contains('[role="tab"]', "Published · 1");
      cy.contains('[role="tab"]', "Completed · 1");
      cy.contains('[role="tab"]', "Canceled · 1");
    });

    cy.contains("Draft Conference").parents("tr").within(() => {
      cy.contains("Aula Magna");
      cy.contains("—");
      cy.get('a[aria-label="Manage Draft Conference"]').should("have.attr", "href", "/org/3/events/11/tasks");
    });
    cy.contains("Career Fair").parents("tr").within(() => {
      cy.contains("Sat, 14 Nov · 18:00");
      cy.contains("42 / 60");
      cy.get('a[aria-label="Manage Career Fair"]').should("have.attr", "href", "/org/3/events/12/tasks");
    });
    cy.contains("Welcome Party").parents("tr").within(() => {
      cy.contains("96 / 100");
      cy.get('a[aria-label="Add follow-up for Welcome Party"]').should("have.attr", "href", "/org/3/events/13/follow-up");
    });
    cy.contains("Canceled Bootcamp").parents("tr").within(() => {
      cy.get('a[aria-label="View Canceled Bootcamp"]').should("have.attr", "href", "/events/14");
    });

    cy.window().then((win) => {
      const calls = (win.fetch as unknown as Cypress.SinonStub).getCalls();
      expect(calls.some((call) => new URL(String(call.args[0])).pathname === "/api/organizations/3/events")).to.equal(true);
    });
    cy.get("[data-testid=organization-events-table] .ui-badge-dot").each(($image) => {
      const image = $image[0] as HTMLImageElement;
      expect(image.naturalWidth, image.src).to.be.greaterThan(0);
      expect(image.getBoundingClientRect().width, image.src).to.equal(image.naturalWidth);
      expect(image.getBoundingClientRect().height, image.src).to.equal(image.naturalHeight);
    });
  });

  it("filters rows with keyboard-accessible status tabs", () => {
    visitDashboard("MEMBER");

    cy.get("[data-testid=organization-events-tabs]").within(() => {
      cy.contains("[role=tab]", "Drafts · 1").click().should("have.attr", "aria-selected", "true");
      cy.contains("[role=tab]", "Drafts · 1").focus().should("have.focus");
    });
    cy.get("[data-testid=organization-events-table]").within(() => {
      cy.contains("Draft Conference").should("be.visible");
      cy.contains("Career Fair").should("not.exist");
    });
  });

  it("shows manager-only creation and follow-up actions", () => {
    visitDashboard("MANAGER");
    cy.contains("a", "Create event").should("have.attr", "href", "/org/3/events/new");
    cy.get('a[aria-label="Add follow-up for Welcome Party"]').should("be.visible");

    visitDashboard("MEMBER");
    cy.contains("a", "Create event").should("not.exist");
    cy.get('a[aria-label="Add follow-up for Welcome Party"]').should("not.exist");
    cy.get('a[aria-label="Manage Career Fair"]').should("be.visible");
    cy.get('a[aria-label="View Canceled Bootcamp"]').should("be.visible");
  });

  it("shows the calendar empty state and keeps Create event manager-only", () => {
    visitDashboard("MANAGER", { events: [] });
    cy.get("[data-testid=empty-state-calendar]").should("be.visible");
    cy.get("[data-testid=empty-state-calendar]").contains("button", "Create event").should("be.visible");

    visitDashboard("MEMBER", { events: [] });
    cy.get("[data-testid=empty-state-calendar]").should("be.visible");
    cy.get("[data-testid=empty-state-calendar]").contains("button", "Create event").should("not.exist");
  });

  it("shows a table skeleton while loading and recovers from an error by retrying", () => {
    visitDashboard("MANAGER", { delayEventsMs: 500 });
    cy.get("[data-testid=table-skeleton]").should("be.visible");
    cy.get("[data-testid=organization-events-table]").should("be.visible");

    visitDashboard("MANAGER", { failEventRequests: 2 });
    cy.get("[data-testid=organization-events-error]").should("be.visible");
    cy.contains("button", "Try again").click();
    cy.contains("Career Fair").should("be.visible");
  });
});
