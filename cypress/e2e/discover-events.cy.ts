const userProfile = {
  id: 7,
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  memberships: [],
};

const organizations = [
  {
    organizationId: 7,
    name: "Robotics",
    description: null,
    status: "NONE",
    role: "NONE",
  },
  {
    organizationId: 8,
    name: "Music Society",
    description: null,
    status: "NONE",
    role: "NONE",
  },
];

const events = [
  {
    id: 1,
    title: "Open campus hackathon",
    date: "2099-11-21",
    startTime: "18:00:00",
    endTime: "20:00:00",
    location: "Aula Magna",
    capacity: 60,
    spotsTaken: 42,
    status: "PUBLISHED",
    organization: { id: 7, name: "Robotics" },
  },
  {
    id: 2,
    title: "Canceled film night",
    date: "2099-11-22",
    startTime: "19:00:00",
    endTime: "21:00:00",
    location: "Cinema",
    capacity: 40,
    spotsTaken: 8,
    status: "CANCELED",
    organization: { id: 8, name: "Music Society" },
  },
  {
    id: 3,
    title: "Past volunteer day",
    date: "2000-05-05",
    startTime: "09:00:00",
    endTime: "12:00:00",
    location: "Main campus",
    capacity: 30,
    spotsTaken: 12,
    status: "PUBLISHED",
    organization: { id: 7, name: "Robotics" },
  },
  {
    id: 4,
    title: "Full lecture",
    date: "2099-11-23",
    startTime: "10:00:00",
    endTime: "11:00:00",
    location: "Room 1",
    capacity: 20,
    spotsTaken: 20,
    status: "PUBLISHED",
    organization: { id: 8, name: "Music Society" },
  },
  {
    id: 5,
    title: "Community garden day",
    date: "2099-11-24",
    startTime: "09:00:00",
    endTime: "13:00:00",
    location: "Botanical garden",
    capacity: 25,
    spotsTaken: 5,
    status: "PUBLISHED",
    organization: { id: 7, name: "Robotics" },
  },
  {
    id: 6,
    title: "Design workshop",
    date: "2099-11-25",
    startTime: "14:00:00",
    endTime: "16:00:00",
    location: "Design lab",
    capacity: 35,
    spotsTaken: 10,
    status: "PUBLISHED",
    organization: { id: 8, name: "Music Society" },
  },
  {
    id: 7,
    title: "Late night study group",
    date: "2099-11-26",
    startTime: "20:00:00",
    endTime: "22:00:00",
    location: "Library",
    capacity: 12,
    spotsTaken: 3,
    status: "PUBLISHED",
    organization: { id: 7, name: "Robotics" },
  },
];

let apiRequestUrls: string[] = [];

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

function visitDiscover(
  path = "/events",
  options: {
    eventBody?: unknown;
    eventDelayMs?: number;
    failedEventRequests?: number;
    organizationStatus?: number;
  } = {},
) {
  apiRequestUrls = [];
  let failedRequests = options.failedEventRequests ?? 0;
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem("token", "test-token");
      cy.stub(win, "fetch").callsFake((input) => {
        const url = new URL(String(input));
        apiRequestUrls.push(url.toString());
        if (url.pathname.endsWith("/api/users/me")) {
          return Promise.resolve(response(userProfile));
        }
        if (url.pathname.endsWith("/api/organizations")) {
          const status = options.organizationStatus ?? 200;
          return Promise.resolve(response(status === 200 ? organizations : {}, status));
        }
        if (url.pathname.endsWith("/api/events")) {
          if (failedRequests > 0) {
            failedRequests -= 1;
            return Promise.reject(new TypeError("Network request failed"));
          }
          const result = response(options.eventBody ?? events);
          if (options.eventDelayMs) {
            return new Promise((resolve) => win.setTimeout(() => resolve(result), options.eventDelayMs));
          }
          return Promise.resolve(result);
        }
        return Promise.resolve(response([]));
      });
    },
  });
}

describe("discover events screen", () => {
  it("loads event cards, statuses, organization filters, and detail destinations", () => {
    cy.viewport(1440, 1000);
    visitDiscover();

    cy.get("[data-testid=discover-events-page]").should("be.visible");
    cy.then(() => {
      expect(apiRequestUrls.some((url) => new URL(url).pathname.endsWith("/api/events"))).to.equal(true);
      expect(apiRequestUrls.some((url) => new URL(url).pathname.endsWith("/api/organizations"))).to.equal(true);
    });
    cy.get("[data-testid=discover-result-count]").should("contain", "7");
    cy.get("[data-testid=event-card-1]").should("contain", "Open campus hackathon").and("contain", "42 of 60 spots taken");
    cy.get("[data-testid=event-card-2]").should("contain", "Canceled");
    cy.get("[data-testid=event-card-3]").should("contain", "Completed");
    cy.get("[data-testid=event-card-4]").should("contain", "Full");
    cy.get("[data-testid=discover-events-grid]")
      .should("have.css", "display", "grid")
      .invoke("css", "grid-template-columns")
      .then((columns) => expect(columns.trim().split(/\s+/)).to.have.length(3));
    cy.get("[data-testid=event-card-7]").should("not.exist");
    cy.get("[data-testid=load-more-events]").click();
    cy.get("[data-testid=event-card-7]").should("be.visible");
    cy.get("[data-testid=event-card-1]").find("button").click();
    cy.location("pathname").should("eq", "/events/1");
  });

  it("restores query filters from the URL and lets users clear them", () => {
    visitDiscover("/events?search=hack&organizationId=7&from=2099-11-01&to=2099-11-30&openOnly=true");

    cy.get("[data-testid=discover-events-page]").should("be.visible");
    cy.get("[data-testid=event-search]").should("have.value", "hack");
    cy.get("[data-testid=organization-filter]").click();
    cy.get("[data-testid=organization-filter-value]").should("have.value", "7");
    cy.get("[data-testid=date-range-filter]").click();
    cy.get("[data-testid=date-from]").should("have.value", "2099-11-01");
    cy.get("[data-testid=date-to]").should("have.value", "2099-11-30");
    cy.get("[data-testid=open-registration-filter]").should("be.checked");
    visitDiscover("/events?search=hack&organizationId=7&from=2099-11-01&to=2099-11-30&openOnly=true");
    cy.get("[data-testid=event-search]").should("have.value", "hack");
    cy.then(() => {
      const url = new URL(apiRequestUrls.find((requestUrl) => new URL(requestUrl).pathname.endsWith("/api/events"))!);
      expect(url.searchParams.get("search")).to.equal("hack");
      expect(url.searchParams.get("organizationId")).to.equal("7");
      expect(url.searchParams.get("from")).to.equal("2099-11-01");
      expect(url.searchParams.get("to")).to.equal("2099-11-30");
    });
    cy.get("[data-testid=clear-filters]").click();
    cy.location("search").should("eq", "");
    cy.get("[data-testid=event-search]").should("have.value", "");
    cy.get("[data-testid=open-registration-filter]").should("not.be.checked");
  });

  it("shows only upcoming published events with available capacity when open-only is enabled", () => {
    visitDiscover();

    cy.get("[data-testid=open-registration-filter]").check();
    cy.location("search").should("include", "openOnly=true");
    cy.get("[data-testid=discover-result-count]").should("contain", "4");
    cy.get("[data-testid=event-card-1]").should("be.visible");
    cy.get("[data-testid=event-card-5]").should("be.visible");
    cy.get("[data-testid=event-card-6]").should("be.visible");
    cy.get("[data-testid=event-card-2]").should("not.exist");
    cy.get("[data-testid=event-card-3]").should("not.exist");
    cy.get("[data-testid=event-card-4]").should("not.exist");
    cy.get("[data-testid=event-card-7]").should("be.visible");
  });

  it("supports keyboard traversal and exposes accessible event filters", () => {
    visitDiscover();

    cy.get("[data-testid=event-search]").focus();
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.focused().should("have.attr", "data-testid", "organization-filter").and("match", "button");
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.focused().should("have.attr", "data-testid", "date-range-filter").and("match", "button");
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.focused().should("have.attr", "data-testid", "open-registration-filter").and("match", ":checkbox");
    cy.get("label.discover-open-filter").should("contain", "Open for registration");
  });

  it("sends a partial date range and keeps events usable if organizations fail to load", () => {
    visitDiscover("/events?from=2099-11-01", { organizationStatus: 500 });

    cy.get("[data-testid=event-card-1]").should("be.visible");
    cy.then(() => {
      const url = new URL(apiRequestUrls.find((requestUrl) => new URL(requestUrl).pathname.endsWith("/api/events"))!);
      expect(url.searchParams.get("from")).to.equal("2099-11-01");
      expect(url.searchParams.has("to")).to.equal(false);
    });
    cy.get("[data-testid=organization-filter-error]").should("contain", "unavailable");
  });

  it("shows loading and no-results feedback states with a clear-filters action", () => {
    visitDiscover("/events?search=missing", { eventBody: [], eventDelayMs: 600 });
    cy.get("[data-testid=event-card-skeleton]").should("be.visible");
    cy.get("[data-testid=empty-state]").should("be.visible");
    cy.get("[data-testid=empty-state-action]").click();
    cy.location("search").should("eq", "");
  });

  it("shows the error state and toast, then retries successfully", () => {
    visitDiscover("/events", { failedEventRequests: 2 });
    cy.get("[data-testid=error-state]").should("be.visible");
    cy.get("[data-testid=toast-region]").should("contain", "events");
    cy.get("[data-testid=error-state-retry]").click();
    cy.get("[data-testid=event-card-1]").should("be.visible");
  });
});
