describe("event card", () => {
  beforeEach(() => cy.visit("/components"));

  it("renders the event card content and status", () => {
    cy.get('[data-testid="event-card-open"]')
      .should("contain", "Campus night")
      .and("contain", "42 of 60 spots taken")
      .and("contain", "Open")
      .find("a,button")
      .contains("View details")
      .should("be.visible");
    cy.get('[data-testid="event-card-open"] [data-testid="event-date"]').should(
      "contain",
      "Sat, 14 Nov · 18:00",
    );
    cy.get('[data-testid="event-card-open"] [role="progressbar"]')
      .should("have.attr", "aria-valuenow", "42")
      .and("have.attr", "aria-valuemax", "60");
  });

  it("covers status precedence and threshold boundaries", () => {
    cy.get('[data-testid="event-card-full"] .ui-badge-danger').should("contain", "Full");
    cy.get('[data-testid="event-card-few"] .ui-badge-warning').should("contain", "Few spots left");
    cy.get('[data-testid="event-card-boundary"] .ui-badge-warning').should("contain", "Few spots left");
    cy.get('[data-testid="event-card-registered"] .ui-badge-info').should("contain", "Registered");
    cy.get('[data-testid="event-card-completed"] .ui-badge-info').should("contain", "Completed");
    cy.get('[data-testid="event-card-canceled"] .ui-badge-danger').should("contain", "Canceled");
  });
});
