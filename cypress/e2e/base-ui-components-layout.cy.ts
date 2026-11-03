describe("T52 base layout and data display components", () => {
  beforeEach(() => cy.visit("/components"));

  it("renders every planned component and variant", () => {
    cy.get('[data-testid="auth-layout-demo"]').should("exist");
    cy.get('[data-testid="tabs-pill"]').should("exist");
    cy.get('[data-testid="tabs-underline"]').should("exist");
    cy.get('[data-testid="table-demo"] thead th').should("have.length.at.least", 2);
    cy.get('[data-testid="modal-demo"]').should("exist");
    cy.get('[data-testid="info-banner-info"]').should("exist");
    cy.get('[data-testid="info-banner-warning"]').should("exist");
    cy.get('[data-testid="avatar-36"]').should("contain", "IV");
    cy.get('[data-testid="avatar-48"]').should("exist");
    cy.get('[data-testid="avatar-80"]').should("exist");
    cy.get('[data-testid="progress-bar"]').should("have.attr", "aria-valuenow", "42");
    cy.get('[data-testid="date-block"]').should("contain", "NOV").and("contain", "12");
    cy.get('[data-testid="info-tile"]').should("exist");
    cy.get('[data-testid="page-header"]').should("contain", "Events");
    cy.get('[data-testid^="icon-"]').should("have.length.at.least", 20);
  });

  it("supports keyboard tabs and modal escape behavior", () => {
    cy.get('[data-testid="tabs-pill"] [role="tab"]').first().should("have.attr", "aria-selected", "true");
    cy.get('[data-testid="tabs-pill"] [role="tab"]').eq(1).click().should("have.attr", "aria-selected", "true");
    cy.get('[data-testid="tabs-pill"] [role="tab"]').first().focus().trigger("keydown", { key: "ArrowRight", code: "ArrowRight" });
    cy.get('[data-testid="tabs-pill"] [role="tab"]').eq(1).should("have.attr", "aria-selected", "true").and("be.focused");
    cy.get('[data-testid="open-modal"]').click();
    cy.get('[role="dialog"]').should("be.visible").and("have.attr", "aria-modal", "true");
    cy.get('[role="dialog"] .ui-modal-close').focus().trigger("keydown", { key: "Tab", code: "Tab", keyCode: 9, which: 9 });
    cy.focused().should("have.attr", "aria-label", "Close");
    cy.get("body").type("{esc}");
    cy.get('[role="dialog"]').should("not.exist");
    cy.get('[data-testid="open-modal"]').should("be.focused");
  });

  it("covers boundary, empty, fallback, and icon behavior", () => {
    cy.get('[data-testid="table-empty-demo"] .ui-table-empty').should("contain", "No registrations");
    cy.get('[data-testid="progress-over-capacity"]').should("have.attr", "aria-valuenow", "60");
    cy.get('[data-testid="avatar-fallback"]').should("contain", "?");
    cy.get('[data-testid="icon-calendar"] img').should("have.attr", "src").and("include", "figma-calendar.svg");
    cy.get('[data-testid="icon-ticket"] img').should("have.attr", "src").and("include", "figma-ticket.svg");
    cy.get('[data-testid="icon-users"] img').should("have.attr", "src").and("include", "figma-users.svg");
    cy.get('[data-testid="icon-trash"] img').should("have.attr", "src").and("include", "figma-trash.svg");
  });

  it("matches the auth layout content and exposes distinct icons", () => {
    cy.get('[data-testid="auth-layout-demo"] .ui-auth-headline').should("contain", "Every campus event, in one place.");
    cy.get('[data-testid="auth-layout-demo"] [data-testid="auth-feature"]').should("have.length", 3);
    const iconNames = ["calendar", "pin", "clock", "users", "building", "bell", "check", "x", "plus", "send", "lock", "trash", "edit", "info", "alert", "chevrons", "arrow-left", "search", "ticket", "megaphone", "tasks", "shield", "logout"];
    cy.get('[data-testid="icon-showcase"] [data-testid^="icon-"]').should("have.length", iconNames.length);
    cy.get('[data-testid="icon-showcase"] [data-testid^="icon-"]').each(($icon) => {
      cy.wrap($icon).find("img, svg").should("have.length", 1);
    });
    cy.get('[data-testid="icon-showcase"] [data-testid^="icon-"] svg path').then(($paths) => {
      const distinctPaths = new Set([...$paths].map((path) => path.getAttribute("d")));
      expect(distinctPaths.size).to.be.greaterThan(8);
    });
  });
});
