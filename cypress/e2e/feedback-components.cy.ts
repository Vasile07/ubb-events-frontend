describe("T53 feedback components", () => {
  beforeEach(() => cy.visit("/components"));

  it("renders the feedback component variants and skeleton semantics", () => {
    cy.get('[data-testid="feedback-demo"]').should("exist");
    cy.get('[data-testid="toast-success-trigger"]').should("exist");
    cy.get('[data-testid="toast-error-trigger"]').should("exist");

    ["search", "calendar", "ticket", "users"].forEach((icon) => {
      cy.get(`[data-testid="empty-state-${icon}"]`)
        .find("img")
        .should("have.attr", "src", `/ui-assets/feedback-${icon}.svg`);
    });
    cy.get('[data-testid="empty-state-action"]').should("be.enabled");
    cy.get('[data-testid="skeleton-block"]').should("have.attr", "aria-hidden", "true");
    cy.get('[data-testid="event-card-skeleton"]').should("have.attr", "aria-busy", "true");
    cy.get('[data-testid="table-skeleton"]').should("have.attr", "aria-busy", "true");
    cy.get('[data-testid="error-state"]').should("contain", "Try again");
    cy.get('[data-testid="error-state-code"]').should("contain", "E-503");
  });

  it("announces, stacks, closes, and auto-dismisses toasts", () => {
    cy.clock();
    cy.get('[data-testid="toast-success-trigger"]').click();
    cy.get('[data-testid="toast-region"]')
      .should("have.attr", "aria-live", "polite")
      .find('[data-testid="toast-success"]')
      .should("contain", "Saved")
      .and("contain", "Your changes are ready.");

    cy.get('[data-testid="toast-error-trigger"]').click();
    cy.get('[data-testid="toast-region"] [data-testid="toast-error"] img')
      .should("have.attr", "src", "/ui-assets/feedback-alert-circle.svg");
    cy.get('[data-testid="toast-region"] .ui-toast').should("have.length", 2);
    cy.get('[data-testid="toast-success-close"]').focus().should("be.focused").click();
    cy.get('[data-testid="toast-success"]').should("not.exist");

    cy.tick(4999);
    cy.get('[data-testid="toast-error"]').should("exist");
    cy.tick(1);
    cy.get('[data-testid="toast-error"]').should("not.exist");
  });

  it("supports empty-state actions and error-state retry with keyboard access", () => {
    cy.get('[data-testid="empty-state-action"]').focus().should("be.focused").click();
    cy.get('[data-testid="empty-action-result"]').should("contain", "Primary action selected");
    cy.get('[data-testid="error-state-retry"]').focus().should("be.focused").click();
    cy.get('[data-testid="error-retry-result"]').should("contain", "Retry requested");
  });

  it("catches render errors and recovers through the error boundary retry action", () => {
    cy.get('[data-testid="error-boundary-trigger"]').click();
    cy.get('[data-testid="error-boundary-fallback"]').should("contain", "Try again");
    cy.get('[data-testid="error-boundary-fallback"] [data-testid="error-state-code"]')
      .should("contain", "E-DEMO");
    cy.get('[data-testid="error-boundary-retry"]').click();
    cy.get('[data-testid="error-boundary-child"]')
      .should("contain", "Recovered content");
  });
});
