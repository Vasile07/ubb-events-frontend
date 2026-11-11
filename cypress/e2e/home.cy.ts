describe("home route", () => {
  it("redirects the default route to events for an authenticated user", () => {
    cy.visit("/", {
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
              memberships: [],
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
    cy.location("pathname").should("eq", "/events");
    cy.get("[data-testid=page-events]").should("be.visible");
  });
});
