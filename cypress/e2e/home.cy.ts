describe("home route", () => {
  it("renders the placeholder home content", () => {
    cy.visit("/");
    cy.contains("UBB Events home").should("be.visible");
  });
});
