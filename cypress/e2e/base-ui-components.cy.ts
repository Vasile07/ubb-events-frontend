describe("base UI components", () => {
  beforeEach(() => cy.visit("/components"));

  it("renders all documented variants and states", () => {
    cy.get("[data-testid=button-demo] button").should("have.length", 11);
    ["Primary", "Secondary", "Ghost", "Danger"].forEach((variant) =>
      cy.get(`[data-testid=button-${variant.toLowerCase()}]`).should("exist"),
    );
    ["neutral", "info", "success", "warning", "danger", "brand"].forEach(
      (tone) => cy.get(`[data-testid=badge-${tone}]`).should("exist"),
    );
    cy.get("[data-testid=text-field-default]").should("exist");
    cy.get("[data-testid=text-field-error]").should("exist");
    cy.get("[data-testid=text-field-both]").should("exist");
    cy.get("[data-testid=text-field-focus]").should("exist");
    cy.get("[data-testid=textarea-demo]").should("exist");
    cy.get("[data-testid=select-demo]").should("exist");
    cy.get("[data-testid=search-field-demo]").should("exist");
    cy.get("[data-testid=filter-chip-default]").should("exist");
    cy.get("[data-testid=filter-chip-active]").should("exist");
    cy.get("[data-testid=button-leading-icon]").find(".ui-leading-icon").should("exist");
  });

  it("exposes keyboard focus and accessible field relationships", () => {
    cy.get("input[data-testid=text-field-error]")
      .should("have.attr", "aria-invalid", "true")
      .and("have.attr", "aria-describedby")
      .then((describedBy) => {
        cy.get(`[id="${describedBy}"]`).should("contain", "Invalid");
      });
    cy.get("input[data-testid=text-field-both]").should("have.attr", "aria-describedby").then((describedBy) => {
      expect(describedBy).to.contain(" ");
      describedBy.split(" ").forEach((id) => cy.get(`[id="${id}"]`).should("exist"));
    });
    cy.get("input[data-testid=text-field-default]").focus().should("be.focused");
    cy.get("input[data-testid=text-field-focus]").focus().should("have.css", "border-top-width", "2px").and("have.css", "border-top-color", "rgb(77, 121, 168)");
    cy.get("select[data-testid=select-demo]").focus().should("be.focused");
    cy.get("textarea[data-testid=textarea-demo]").focus().should("be.focused");
    cy.get("[data-testid=button-loading]").should("be.disabled");
    cy.get("[data-testid=button-disabled]").should("be.disabled");
  });

  it("supports the configured text area height and filter state", () => {
    cy.get("textarea[data-testid=textarea-demo]")
      .should("have.css", "height", "120px")
      .and("have.attr", "aria-describedby");
    cy.get("[data-testid=filter-chip-default]").should("not.have.class", "is-active");
    cy.get("[data-testid=filter-chip-active]").should("have.class", "is-active");
    cy.get("[data-testid=filter-chip-active]").should("have.attr", "aria-pressed", "true");
    cy.get("input[data-testid=search-field-demo]").parent().find(".ui-search-icon img").should("have.attr", "src").and("include", "/ui-assets/");
    cy.get("[data-testid=filter-chip-active] .ui-chevron img").should("have.attr", "src").and("include", "/ui-assets/");
  });
});
