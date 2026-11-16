const profile = {
  id: 7,
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  memberships: [{ organizationId: 3, role: "MANAGER", organizationName: "Robotics Club" }],
};

describe("profile screen", () => {
  it("renders the profile and saves trimmed names without sending email", () => {
    let updateBody: unknown;
    cy.visit("/profile", {
      onBeforeLoad(win) {
        win.localStorage.setItem("token", "jwt");
        cy.stub(win, "fetch").callsFake((input, init) => {
          const url = String(input);
          if (url.endsWith("/api/users/me") && init?.method === "PUT") {
            updateBody = JSON.parse(String(init.body));
            return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ...profile, ...updateBody }) } as Response);
          }
          if (url.endsWith("/api/users/me")) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(profile) } as Response);
          return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) } as Response);
        });
      },
    });

    cy.get("[data-testid=page-profile]").should("contain", "My profile");
    cy.get("[data-testid=profile-avatar]").should("contain", "AL");
    cy.get("[data-testid=profile-email]").should("have.value", "ada@example.com").and("be.disabled");
    cy.contains("Robotics Club").should("be.visible");
    cy.get("[data-testid=profile-save]").should("be.disabled");
    cy.get("[data-testid=profile-first-name]").clear().type("  Grace  ");
    cy.get("[data-testid=profile-last-name]").clear().type(" Hopper ");
    cy.get("[data-testid=profile-save]").should("not.be.disabled").click();
    cy.wrap(null).then(() => expect(updateBody).to.deep.equal({ firstName: "Grace", lastName: "Hopper" }));
    cy.get("[data-testid=toast-region]").should("contain", "Profile updated");
  });
});
