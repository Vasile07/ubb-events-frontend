describe("home route", () => {
  it("renders the placeholder home content", () => {
    cy.visit("/");
    cy.contains("Foundations").should("be.visible");
  });
});
