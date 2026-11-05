describe("authenticated app shell and navigation", () => {
  const visitAuthenticated = (
    path: string,
    memberships: Array<{ organizationId: number; role: "MEMBER" | "MANAGER"; organizationName?: string }>,
  ) => {
    cy.visit(path, {
      onBeforeLoad(win) {
        win.localStorage.setItem("token", "jwt");
        cy.stub(win, "fetch").callsFake((input) => {
          if (String(input).endsWith("/api/users/me")) {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve({
                id: 7,
                firstName: "Ada",
                lastName: "Lovelace",
                email: "ada@example.com",
                memberships,
              }),
            } as Response);
          }
          return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) } as Response);
        });
      },
    });
  };

  it("renders the authenticated shell, profile link, bell, and route-aware active link", () => {
    visitAuthenticated("/events/9", []);
    cy.get("[data-testid=app-shell]").should("be.visible");
    cy.get("[data-testid=app-logo]").should("contain", "UBB Events");
    ["Discover", "My registrations", "My tasks", "Organizations"].forEach((label) =>
      cy.get("[data-testid=app-nav]").contains(label).should("be.visible"),
    );
    cy.get("[data-testid=notification-button]").should("have.attr", "aria-label", "Notifications");
    cy.get("[data-testid=profile-link]").should("have.attr", "href", "/profile").and("contain", "AL").and("contain", "Ada Lovelace");
    cy.get("[data-testid=nav-events]").should("have.attr", "aria-current", "page");

    visitAuthenticated("/profile", []);
    cy.get("[data-testid=nav-profile-state]").should("have.attr", "data-variant", "None");
  });

  it("hides Workspace without memberships and links directly with one membership", () => {
    visitAuthenticated("/events", []);
    cy.get("[data-testid=workspace-nav]").should("not.exist");

    visitAuthenticated("/events", [{ organizationId: 3, role: "MEMBER", organizationName: "Robotics" }]);
    cy.get("[data-testid=workspace-nav]").should("have.attr", "href", "/org/3/events");
    visitAuthenticated("/org/3/events", [{ organizationId: 3, role: "MEMBER", organizationName: "Robotics" }]);
    cy.get("[data-testid=workspace-nav]").should("have.class", "is-active").and("have.attr", "aria-current", "page");
  });

  it("opens an accessible picker for multiple memberships and uses the approved fallback label", () => {
    visitAuthenticated("/events", [
      { organizationId: 3, role: "MEMBER", organizationName: "Robotics" },
      { organizationId: 8, role: "MANAGER" },
    ]);
    cy.get("[data-testid=workspace-nav]").click();
    cy.get("[data-testid=workspace-picker]").should("be.visible");
    cy.get("[data-testid=workspace-picker]").contains("Robotics");
    cy.get("[data-testid=workspace-picker]").contains("Organization 8");
    cy.get("[data-testid=workspace-picker-link-8]").should("have.attr", "href", "/org/8/events");
    cy.get("[data-testid=workspace-picker-link-3]").should("have.focus");
    cy.get("[data-testid=workspace-picker-link-3]").trigger("keydown", { key: "ArrowDown" });
    cy.get("[data-testid=workspace-picker-link-8]").should("have.focus");
    cy.get("[data-testid=workspace-picker]").trigger("keydown", { key: "Escape" });
    cy.get("[data-testid=workspace-picker]").should("not.exist");
    cy.get("[data-testid=workspace-nav]").should("have.focus");
  });
});
