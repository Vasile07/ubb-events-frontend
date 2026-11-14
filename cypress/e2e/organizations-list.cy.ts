const profile = {
  id: 7,
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  memberships: [],
};

const organizations = [
  { organizationId: 1, name: "Robotics Club", description: "Build and learn.", status: "MEMBER", role: "MEMBER" },
  { organizationId: 2, name: "Music Society", description: "Make music together.", status: "PENDING", role: "NONE" },
  { organizationId: 3, name: "Debate Union", description: "Practice public speaking.", status: "NONE", role: "NONE" },
];

function json(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as Response;
}

function visitOrganizations(options: { organizations?: unknown; delayMs?: number; membershipStatus?: number } = {}) {
  cy.visit("/organizations", {
    onBeforeLoad(win) {
      win.localStorage.setItem("token", "test-token");
      cy.stub(win, "fetch").callsFake((input, init) => {
        const url = new URL(String(input));
        if (url.pathname.endsWith("/api/users/me")) return Promise.resolve(json(profile));
        if (url.pathname.endsWith("/membership-requests")) return Promise.resolve(json({}, options.membershipStatus ?? 201));
        if (url.pathname.endsWith("/api/organizations")) {
          const result = json(options.organizations ?? organizations);
          if (options.delayMs) return new Promise((resolve) => win.setTimeout(() => resolve(result), options.delayMs));
          return Promise.resolve(result);
        }
        return Promise.resolve(json([]));
      });
    },
  });
}

describe("organizations list screen", () => {
  it("renders cards, membership actions, and filters by name", () => {
    visitOrganizations();
    cy.get("[data-testid=organizations-page]").should("be.visible");
    cy.get("[data-testid=organization-card-1]").should("contain", "Robotics Club").and("contain", "Open organization");
    cy.get("[data-testid=organization-card-2]").should("contain", "Waiting for approval");
    cy.get("[data-testid=organization-card-3]").should("contain", "Request membership");
    cy.get("[data-testid=organization-search]").type("debate");
    cy.get("[data-testid=organization-card-3]").should("be.visible");
    cy.get("[data-testid=organization-card-1]").should("not.exist");
  });

  it("requests membership and changes the card to pending", () => {
    visitOrganizations();
    cy.get("[data-testid=request-membership-3]").click();
    cy.get("[data-testid=organization-card-3]").should("contain", "Waiting for approval");
    cy.get("[data-testid=toast-region]").should("contain", "request");
  });

  it("handles loading and no-match states", () => {
    visitOrganizations({ delayMs: 600 });
    cy.get("[data-testid=organization-card-skeleton]").should("be.visible");
    cy.get("[data-testid=organizations-page]").should("be.visible");
    cy.get("[data-testid=organization-search]").type("missing");
    cy.get("[data-testid=organizations-empty]").should("contain", "No organizations match");
  });
});
