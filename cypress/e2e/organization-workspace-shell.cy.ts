import { invalidateMembershipRequests, organizationMembershipRequestsKey } from "../../src/features/organizations/membershipRequestQueries";

type Membership = { organizationId: number; role: "MEMBER" | "MANAGER" };

const profile = {
  id: 7,
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  memberships: [] as Membership[],
};

function response(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as Response;
}

function visitWorkspace(
  path: string,
  memberships: Membership[],
  options: { organization?: unknown; requests?: unknown; organizationStatus?: number; requestsStatus?: number; delayMs?: number } = {},
) {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem("token", "jwt");
      win.fetch = cy.stub().callsFake((input) => {
        const url = new URL(String(input));
        if (url.pathname.endsWith("/api/users/me")) {
          return Promise.resolve(response({ ...profile, memberships }));
        }
        if (url.pathname === "/api/organizations/3" && !url.pathname.endsWith("membership-requests")) {
          const result = response(options.organization ?? { organizationId: 3, name: "Societatea Hermes", description: "A student organization", status: "MEMBER", role: memberships[0]?.role ?? "MEMBER" }, options.organizationStatus ?? 200);
          return options.delayMs ? new Promise((resolve) => win.setTimeout(() => resolve(result), options.delayMs)) : Promise.resolve(result);
        }
        if (url.pathname.endsWith("/api/organizations/3/membership-requests")) {
          return Promise.resolve(response(options.requests ?? [{ id: 1 }, { id: 2 }, { id: 3 }], options.requestsStatus ?? 200));
        }
        return Promise.resolve(response([]));
      }) as typeof fetch;
    },
  });
}

describe("organization workspace shell", () => {
  it("renders manager navigation, organization header, pending count, and layout spacing", () => {
    visitWorkspace("/org/3/events", [{ organizationId: 3, role: "MANAGER" }]);
    cy.get("[data-testid=organization-workspace]").should("be.visible");
    cy.get("[data-testid=workspace-organization-name]").should("contain", "Societatea Hermes");
    cy.get(".workspace-org-header").should("contain", "A student organization");
    cy.get(".workspace-org-header span").should("contain", "A student organization");
    cy.get("[data-testid=workspace-role-badge]").should("contain", "Manager");
    cy.get("[data-testid=workspace-membership-requests] img").should(($image) => {
      expect(($image[0] as HTMLImageElement).naturalWidth).to.be.greaterThan(0);
    });
    cy.get("[data-testid=organization-workspace] img").each(($image) => {
      const image = $image[0] as HTMLImageElement;
      expect(image.naturalWidth, image.src).to.be.greaterThan(0);
      expect(image.getBoundingClientRect().width, image.src).to.equal(image.naturalWidth);
      expect(image.getBoundingClientRect().height, image.src).to.equal(image.naturalHeight);
    });
    cy.get("[data-testid=workspace-membership-requests]").should("contain", "3");
    cy.get("[data-testid=workspace-main]").should("have.css", "padding-left", "48px").and("have.css", "padding-top", "40px");
    cy.get("[data-testid=workspace-nav-events]").should("have.attr", "aria-current", "page");
    cy.get("[data-testid=workspace-back-discover]").should("have.attr", "href", "/events");
  });

  it("invalidates the shared pending-request query after a successful decision", () => {
    const invalidateQueries = cy.stub().resolves();
    const queryClient = { invalidateQueries } as never;

    return invalidateMembershipRequests(queryClient, 3).then(() => {
      expect(invalidateQueries).to.have.been.calledOnceWith({
        queryKey: organizationMembershipRequestsKey(3),
      });
    });
  });

  it("hides membership requests and does not load its API for plain members", () => {
    visitWorkspace("/org/3/members", [{ organizationId: 3, role: "MEMBER" }]);
    cy.get("[data-testid=organization-workspace]").should("be.visible");
    cy.get("[data-testid=workspace-role-badge]").should("contain", "Member");
    cy.get("[data-testid=workspace-membership-requests]").should("not.exist");
    cy.get("[data-testid=workspace-nav-members]").should("have.attr", "aria-current", "page");
    cy.window().then((win) => {
      const fetchStub = win.fetch as unknown as Cypress.SinonStub;
      expect(fetchStub.getCalls().some((call) => String(call.args[0]).includes("membership-requests"))).to.equal(false);
    });
  });

  it("shows zero for an empty request list and a neutral count when requests fail", () => {
    visitWorkspace("/org/3/requests", [{ organizationId: 3, role: "MANAGER" }], { requests: [] });
    cy.get("[data-testid=workspace-membership-requests]").should("contain", "0");
    cy.get("nav[aria-label='Organization navigation']").should("be.visible");

    visitWorkspace("/org/3/requests", [{ organizationId: 3, role: "MANAGER" }], { requestsStatus: 500 });
    cy.get("[data-testid=workspace-membership-requests]").should("contain", "—");
  });

  it("keeps navigation keyboard accessible and marks the active route", () => {
    visitWorkspace("/org/3/members", [{ organizationId: 3, role: "MANAGER" }]);
    cy.get("nav[aria-label='Organization navigation']").should("be.visible");
    cy.get("[data-testid=workspace-nav-members]").should("have.attr", "aria-current", "page").focus().should("have.focus");
    cy.get("[data-testid=workspace-back-discover]").should("have.attr", "href", "/events");
  });

  it("shows loading and recoverable organization errors", () => {
    visitWorkspace("/org/3/events", [{ organizationId: 3, role: "MANAGER" }], { delayMs: 500 });
    cy.get("[data-testid=workspace-loading]").should("be.visible");

    visitWorkspace("/org/3/events", [{ organizationId: 3, role: "MANAGER" }], { organizationStatus: 500 });
    cy.get("[data-testid=workspace-error]").should("be.visible").and("contain", "organization");
    cy.get("[data-testid=workspace-retry]").should("be.visible");
  });
});
