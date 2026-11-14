const profile = { id: 7, firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", memberships: [] };

const organization = {
  organizationId: 7,
  name: "Robotics Club",
  description: "Build and learn together.",
  status: "NONE",
  role: "NONE",
};

const events = [
  { id: 11, title: "Open campus hackathon", date: "2099-11-21", startTime: "18:00:00", endTime: "20:00:00", location: "Aula Magna", capacity: 60, spotsTaken: 42, status: "PUBLISHED", organization: { id: 7, name: "Robotics Club" } },
  { id: 12, title: "Past volunteer day", date: "2000-05-05", startTime: "09:00:00", endTime: "12:00:00", location: "Main campus", capacity: 30, spotsTaken: 12, status: "COMPLETED", organization: { id: 7, name: "Robotics Club" } },
];
let observedRequests: string[] = [];

function json(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as Response;
}

function visitDetails(options: { organizationStatus?: number; events?: unknown; delayMs?: number } = {}) {
  observedRequests = [];
  cy.visit("/organizations/7", {
    onBeforeLoad(win) {
      win.localStorage.setItem("token", "test-token");
      cy.stub(win, "fetch").callsFake((input) => {
        const url = new URL(String(input));
        observedRequests.push(`${url.pathname}${url.search}`);
        if (url.pathname.endsWith("/api/users/me")) return Promise.resolve(json(profile));
        if (url.pathname.endsWith("/api/organizations/7")) {
          const response = json(organization, options.organizationStatus ?? 200);
          return options.delayMs ? new Promise((resolve) => win.setTimeout(() => resolve(response), options.delayMs)) : Promise.resolve(response);
        }
        if (url.pathname.endsWith("/api/events")) return Promise.resolve(json(options.events ?? events));
        if (url.pathname.endsWith("/membership-requests")) return Promise.resolve(json({}, 201));
        return Promise.resolve(json([]));
      });
    },
  });
}

describe("organization details screen", () => {
  it("renders organization identity, membership action, upcoming events, and private members note", () => {
    cy.viewport(1455, 752);
    visitDetails();
    cy.get("[data-testid=page-organization-details]").should("be.visible").and("contain", "Robotics Club");
    cy.contains("Build and learn together.").should("be.visible");
    cy.contains("Request membership").should("be.visible");
    cy.contains("Not a member").should("be.visible");
    cy.contains("Back to organizations").should("be.visible");
    cy.get("[data-testid=organization-back-link] img").should(($image) => expect(($image[0] as HTMLImageElement).naturalWidth).to.equal(18));
    cy.get("[data-testid=organization-logo-tile]").should("have.css", "width", "96px").and("have.css", "background-color", "rgb(255, 255, 255)");
    cy.get("[data-testid=organization-logo-tile] img").should(($image) => expect(($image[0] as HTMLImageElement).naturalWidth).to.equal(44));
    cy.get("[data-testid=organization-hero] > img").should(($image) => expect(($image[0] as HTMLImageElement).naturalWidth).to.equal(380));
    cy.get("[data-testid=organization-hero]").should("have.css", "height", "168px");
    cy.get(".organization-details-columns").should("have.css", "grid-template-columns", "888px 360px");
    cy.get(".organization-details-about").should("have.css", "width", "360px");
    cy.get(".organization-details-about li img").should("have.length", 2).each(($image) => {
      expect(($image[0] as HTMLImageElement).naturalWidth).to.equal(18);
    });
    cy.contains("Upcoming events").should("be.visible");
    cy.get("[data-testid=organization-event-11]").should("contain", "Open campus hackathon");
    cy.get("[data-testid=organization-event-12]").should("not.exist");
    cy.contains("Member lists are private").should("be.visible");
    cy.contains("Public details only").should("be.visible");
    cy.contains("Membership is approved by managers").should("be.visible");
    cy.contains("organization code").should("not.exist");
    cy.then(() => {
      expect(observedRequests).to.include("/api/organizations/7");
      expect(observedRequests).to.include("/api/events?organizationId=7");
    });
  });

  it("renders the empty upcoming events state and updates membership after a request", () => {
    visitDetails({ events: [] });
    cy.get("[data-testid=organization-events-empty]").should("be.visible");
    cy.contains("Request membership").click();
    cy.contains("Waiting for approval").should("be.visible");
  });

  it("shows the not-found state for an unknown organization", () => {
    visitDetails({ organizationStatus: 404 });
    cy.get("[data-testid=organization-not-found]").should("be.visible").and("contain", "Organization not found");
    cy.get("[data-testid=page-organization-details]").should("not.exist");
    cy.then(() => expect(observedRequests.some((request) => request.startsWith("/api/events"))).to.equal(false));
  });

  it("shows a loading state while the organization request is pending", () => {
    visitDetails({ delayMs: 1500 });
    cy.get("[data-testid=page-organization-details][aria-busy=true]").should("be.visible");
    cy.contains("Robotics Club").should("be.visible");
  });

  it("shows a retry action when the organization request fails", () => {
    visitDetails({ organizationStatus: 500 });
    cy.get("[data-testid=organization-details-error]").should("be.visible").and("contain", "We couldn’t load this organization");
    cy.get("[data-testid=error-state-retry]").should("be.enabled");
  });
});
