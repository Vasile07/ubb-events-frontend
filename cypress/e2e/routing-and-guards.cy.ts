describe("routing and route guards", () => {
  const visitAnonymous = (path: string) => {
    cy.visit(path, {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
  };

  const visitAuthenticated = (
    path: string,
    memberships: Array<{ organizationId: number; role: "MEMBER" | "MANAGER" }>,
  ) => {
    cy.visit(path, {
      onBeforeLoad(win) {
        win.localStorage.setItem("token", "jwt");
        cy.stub(win, "fetch").callsFake((input) => {
          if (String(input).endsWith("/api/users/me")) {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: () =>
                Promise.resolve({
                  id: 7,
                  firstName: "Ada",
                  lastName: "Lovelace",
                  email: "ada@example.com",
                  memberships,
                }),
            } as Response);
          }
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve([]),
          } as Response);
        });
      },
    });
  };

  it("renders public placeholders and redirects the default and unknown paths", () => {
    visitAnonymous("/login");
    cy.get("[data-testid=page-login]").should("be.visible");

    visitAnonymous("/register");
    cy.get("[data-testid=page-register]").should("be.visible");

    visitAuthenticated("/", []);
    cy.location("pathname").should("eq", "/events");
    cy.get("[data-testid=page-events]").should("be.visible");

    visitAuthenticated("/does-not-exist", []);
    cy.location("pathname").should("eq", "/events");
  });

  it("redirects anonymous users to login and remembers the exact target", () => {
    visitAnonymous("/events?view=calendar#today");
    cy.location("pathname").should("eq", "/login");
    cy.get("[data-testid=login-from]").should(
      "have.attr",
      "data-from",
      "/events?view=calendar#today",
    );
  });

  it("redirects anonymous users from every protected route to login", () => {
    const protectedRoutes = [
      "/events",
      "/events/9",
      "/my-registrations",
      "/my-tasks",
      "/organizations",
      "/organizations/3",
      "/profile",
      "/org/3/events",
      "/org/3/events/new",
      "/org/3/events/9/edit",
      "/org/3/events/9/tasks",
      "/org/3/events/9/registrations",
      "/org/3/events/9/chat",
      "/org/3/events/9/announcements",
      "/org/3/events/9/follow-up",
      "/org/3/requests",
      "/org/3/members",
    ];

    protectedRoutes.forEach((path) => {
      visitAnonymous(path);
      cy.location("pathname").should("eq", "/login");
    });
  });

  it("redirects authenticated users away from public auth pages", () => {
    visitAuthenticated("/login", []);
    cy.location("pathname").should("eq", "/events");

    visitAuthenticated("/register", []);
    cy.location("pathname").should("eq", "/events");
  });

  it("allows authenticated users into every authenticated destination", () => {
    const authenticatedRoutes = [
      "/events",
      "/events/9",
      "/my-registrations",
      "/my-tasks",
      "/organizations",
      "/organizations/3",
      "/profile",
    ];

    authenticatedRoutes.forEach((path) => {
      visitAuthenticated(path, []);
      cy.location("pathname").should("eq", path);
      cy.get("[data-testid^=page-]").should("be.visible");
    });
  });

  it("allows a member into member workspace routes and blocks manager routes", () => {
    visitAuthenticated("/org/3/events", [{ organizationId: 3, role: "MEMBER" }]);
    cy.get("[data-testid=page-org-events]").should("be.visible");

    visitAuthenticated("/org/3/requests", [{ organizationId: 3, role: "MEMBER" }]);
    cy.get("[data-testid=page-forbidden]").should("be.visible");

    visitAuthenticated("/org/3/events/9/follow-up", [
      { organizationId: 3, role: "MEMBER" },
    ]);
    cy.get("[data-testid=page-forbidden]").should("be.visible");
  });

  it("allows a manager into manager workspace routes", () => {
    visitAuthenticated("/org/3/requests", [
      { organizationId: 3, role: "MANAGER" },
    ]);
    cy.get("[data-testid=page-org-requests]").should("be.visible");

    visitAuthenticated("/org/3/events/9/follow-up", [
      { organizationId: 3, role: "MANAGER" },
    ]);
    cy.get("[data-testid=page-org-event-follow-up]").should("be.visible");
  });

  it("registers every member workspace route in the route map", () => {
    const memberRoutes = [
      "/org/3/events",
      "/org/3/events/new",
      "/org/3/events/9/edit",
      "/org/3/events/9/tasks",
      "/org/3/events/9/registrations",
      "/org/3/events/9/chat",
      "/org/3/events/9/announcements",
      "/org/3/events/9/follow-up",
      "/org/3/requests",
      "/org/3/members",
    ];

    memberRoutes.forEach((path) => {
      visitAuthenticated(path, [{ organizationId: 3, role: "MANAGER" }]);
      cy.location("pathname").should("eq", path);
      cy.get("[data-testid^=page-]").should("be.visible");
    });
  });

  it("blocks non-members and invalid organization ids with the 403 page", () => {
    visitAuthenticated("/org/3/events", []);
    cy.get("[data-testid=page-forbidden]").should("be.visible");

    visitAuthenticated("/org/4/events", [
      { organizationId: 3, role: "MANAGER" },
    ]);
    cy.get("[data-testid=page-forbidden]").should("be.visible");

    visitAuthenticated("/org/not-a-number/events", [
      { organizationId: 3, role: "MANAGER" },
    ]);
    cy.get("[data-testid=page-forbidden]").should("be.visible");

    ["0", "-1", "3.5", "9007199254740992"].forEach((organizationId) => {
      visitAuthenticated(`/org/${organizationId}/events`, [
        { organizationId: 3, role: "MANAGER" },
      ]);
      cy.get("[data-testid=page-forbidden]").should("be.visible");
    });
  });

  it("does not flash a route while the auth provider resolves", () => {
    cy.visit("/events", {
      onBeforeLoad(win) {
        win.localStorage.setItem("token", "jwt");
        cy.stub(win, "fetch").callsFake(
          () => new Promise(() => undefined) as Promise<Response>,
        );
      },
    });
    cy.get("[data-testid=auth-loading]").should("be.visible");
    cy.get("[data-testid=page-events]").should("not.exist");
  });
});
