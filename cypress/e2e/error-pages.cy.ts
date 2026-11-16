describe("error pages (404 and 403)", () => {
  type FetchHandler = (url: string, init?: RequestInit) => Promise<Response>;
  type Membership = { organizationId: number; role: "MEMBER" | "MANAGER"; organizationName?: string };

  const json = (status: number, body: unknown): Promise<Response> =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      statusText: "",
      json: () => Promise.resolve(body),
    } as Response);

  const forbidden = () => json(403, { status: 403, message: "Access denied", errors: [] });

  const MANAGER_TEXT =
    "This area is only available to managers of the organization. Ask a manager of Societatea Hermes if you need access.";
  const MEMBER_TEXT =
    "This area is only available to members of the organization. Ask to join it from the Organizations page if you need access.";

  const visitAuthenticated = (
    path: string,
    memberships: Membership[] = [],
    handler: FetchHandler = () => json(200, []),
  ) => {
    cy.visit(path, {
      onBeforeLoad(win) {
        win.localStorage.clear();
        win.localStorage.setItem("token", "jwt");
        cy.stub(win, "fetch").callsFake((input: RequestInfo | URL, init?: RequestInit) => {
          const url = String(input);
          if (url.endsWith("/api/users/me")) {
            return json(200, { id: 7, firstName: "Andrei", lastName: "Pop", email: "a@b.ro", memberships });
          }
          return handler(url, init);
        });
      },
    });
  };

  const visitAnonymous = (path: string) => {
    cy.visit(path, {
      onBeforeLoad(win) {
        win.localStorage.clear();
        cy.stub(win, "fetch").callsFake(() => json(200, []));
      },
    });
  };

  it("shows the 404 page with the navbar for an unknown route when authenticated", () => {
    visitAuthenticated("/this/does/not/exist");

    cy.location("pathname").should("eq", "/this/does/not/exist");
    cy.get("[data-testid=page-not-found]").should("be.visible").within(() => {
      cy.get("[data-testid=error-code]").should("have.text", "404").and("have.attr", "aria-hidden", "true");
      cy.contains("h1", "This page doesn’t exist").should("be.visible");
      cy.contains(
        "The page you are looking for was moved, deleted or never existed. Check the link or head back to the events.",
      ).should("be.visible");
      cy.contains("button", "Back to discover").should("have.class", "ui-button-primary");
      cy.contains("button", "Go back").should("have.class", "ui-button-secondary");
    });
    cy.get("[data-testid=app-shell]").should("exist");
    cy.get("[data-testid=app-nav]").should("be.visible");
  });

  it("shows the 404 page without the navbar for an unknown route when anonymous", () => {
    visitAnonymous("/nowhere");

    cy.location("pathname").should("eq", "/nowhere");
    cy.get("[data-testid=page-not-found]").should("be.visible");
    cy.get("[data-testid=app-shell]").should("not.exist");
  });

  it("goes to discover from the 404 page", () => {
    visitAuthenticated("/nowhere");
    cy.contains("button", "Back to discover").click();
    cy.location("pathname").should("eq", "/events");
  });

  it("goes back to the previous page, or to discover when opened directly", () => {
    visitAuthenticated("/my-tasks");
    cy.get("[data-testid=page-my-tasks]").should("be.visible");
    cy.window().then((win) => {
      win.history.pushState({ usr: null, key: "t58", idx: 1 }, "", "/nowhere");
      win.dispatchEvent(new win.PopStateEvent("popstate", { state: { usr: null, key: "t58", idx: 1 } }));
    });
    cy.get("[data-testid=page-not-found]").should("be.visible");
    cy.contains("button", "Go back").click();
    cy.location("pathname").should("eq", "/my-tasks");

    visitAuthenticated("/nowhere");
    cy.contains("button", "Go back").click();
    cy.location("pathname").should("eq", "/events");
  });

  it("shows the manager 403 with the organization name and the navbar on a manager-only route", () => {
    visitAuthenticated("/org/3/requests", [
      { organizationId: 3, role: "MEMBER", organizationName: "Societatea Hermes" },
    ]);

    cy.get("[data-testid=page-forbidden]").should("be.visible").within(() => {
      cy.get("[data-testid=error-code]").should("have.text", "403");
      cy.contains("h1", "You don’t have access to this page").should("be.visible");
      cy.contains(MANAGER_TEXT).should("be.visible");
      cy.contains("button", "Back to discover").should("be.visible");
      cy.contains("button", "My organizations").should("be.visible");
    });
    cy.get("[data-testid=app-nav]").should("be.visible");
  });

  it("falls back to 'the organization' when the organization name is unknown", () => {
    visitAuthenticated("/org/3/events/9/follow-up", [{ organizationId: 3, role: "MEMBER" }]);

    cy.get("[data-testid=page-forbidden]").should(
      "contain.text",
      "Ask a manager of the organization if you need access.",
    );
  });

  it("shows the member 403 with the navbar on a member route for a non-member", () => {
    visitAuthenticated("/org/4/events", [{ organizationId: 3, role: "MANAGER" }]);

    cy.get("[data-testid=page-forbidden]").should("be.visible").and("contain.text", MEMBER_TEXT);
    cy.get("[data-testid=app-nav]").should("be.visible");
  });

  it("goes to the organizations list from the 403 page", () => {
    visitAuthenticated("/org/4/events", []);
    cy.contains("button", "My organizations").click();
    cy.location("pathname").should("eq", "/organizations");
  });

  it("shows the 403 page when the organization workspace query is forbidden by the API", () => {
    visitAuthenticated("/org/3/members", [{ organizationId: 3, role: "MEMBER" }], (url) =>
      url.endsWith("/api/organizations/3") ? forbidden() : json(200, []),
    );

    cy.get("[data-testid=page-forbidden]").should("be.visible").and("contain.text", MEMBER_TEXT);
    cy.get("[data-testid=workspace-error]").should("not.exist");
    cy.get("[data-testid=app-nav]").should("be.visible");
  });

  it("shows the 403 page when the event workspace query is forbidden by the API", () => {
    visitAuthenticated("/org/3/events/9/tasks", [{ organizationId: 3, role: "MEMBER" }], (url) => {
      if (url.endsWith("/api/organizations/3")) {
        return json(200, { organizationId: 3, name: "Societatea Hermes", description: null, role: "MEMBER", status: "MEMBER" });
      }
      if (url.endsWith("/api/organizations/3/events/9")) return forbidden();
      return json(200, []);
    });

    cy.get("[data-testid=page-forbidden]").should("be.visible").and("contain.text", MEMBER_TEXT);
    cy.get("[data-testid=event-workspace-error]").should("not.exist");
  });

  it("keeps the decorative circles hidden from assistive technology", () => {
    visitAuthenticated("/nowhere");

    cy.get("[data-testid=page-not-found] .error-page-decor").should("have.length", 3).each(($decor) => {
      expect($decor.attr("aria-hidden")).to.equal("true");
      expect($decor.attr("alt")).to.equal("");
    });
    cy.get("[data-testid=page-not-found] .error-page-decor").then(($decor) => {
      expect([...$decor].map((item) => item.getAttribute("src"))).to.deep.equal([
        "/ui-assets/error-decor-120.svg",
        "/ui-assets/error-decor-260.svg",
        "/ui-assets/error-decor-320.svg",
      ]);
    });
  });
});
