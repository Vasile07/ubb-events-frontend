describe("Foundations design tokens", () => {
  beforeEach(() => cy.visit("/"));

  it("renders the Foundations demo sections", () => {
    cy.get("h1").contains("Foundations").should("be.visible");
    cy.contains("Brand palette").should("be.visible");
    cy.contains("Status colors").should("be.visible");
    cy.contains("Typography").should("be.visible");
    cy.contains("Elevation & radius").should("be.visible");
  });

  it("applies the page background and reset", () => {
    cy.document().then((document) => {
      const body = document.body;
      const root = document.documentElement;
      expect(getComputedStyle(body).margin).to.equal("0px");
      expect(getComputedStyle(root).backgroundColor).to.equal(
        "rgb(243, 248, 253)",
      );
    });
  });

  it("exposes the palette and typography tokens", () => {
    cy.get("[data-token=blue-900]").should(
      "have.css",
      "background-color",
      "rgb(34, 58, 94)",
    );
    cy.get(".text-display-hero")
      .should("have.css", "font-size", "44px")
      .and("have.css", "font-weight", "800");
  });

  it("defines semantic status, spacing, radius, and shadow tokens", () => {
    const expectedColors = [
      ["--color-blue-900", "#223a5e"],
      ["--color-blue-800", "#355982"],
      ["--color-blue-700", "#4d79a8"],
      ["--color-blue-600", "#6e9ecc"],
      ["--color-blue-400", "#9fc0e3"],
      ["--color-blue-200", "#d0e1f2"],
      ["--color-blue-50", "#f3f8fd"],
      ["--status-success-fg", "#2b7a57"],
      ["--status-success-bg", "#e2f3ea"],
      ["--status-warning-fg", "#9a6410"],
      ["--status-warning-bg", "#fbf0da"],
      ["--status-danger-fg", "#b23a48"],
      ["--status-danger-bg", "#fbe5e8"],
    ];
    const expectedVars = [
      "--bg-page",
      "--bg-surface",
      "--bg-brand",
      "--text-primary",
      "--text-secondary",
      "--text-muted",
      "--text-inverse",
      "--border-default",
      "--border-strong",
      "--border-focus",
      "--accent",
      "--space-1",
      "--space-2",
      "--space-3",
      "--space-4",
      "--space-5",
      "--space-6",
      "--space-7",
      "--space-8",
      "--space-9",
      "--space-10",
      "--space-11",
      "--space-12",
      "--radius-sm",
      "--radius-md",
      "--radius-lg",
      "--radius-xl",
      "--radius-pill",
      "--shadow-card",
      "--shadow-raised",
    ];
    cy.document().then((document) => {
      const styles = getComputedStyle(document.documentElement);
      expectedColors.forEach(([name, color]) =>
        expect(styles.getPropertyValue(name).trim()).to.equal(color),
      );
      expectedVars.forEach((name) =>
        expect(styles.getPropertyValue(name).trim(), name).to.not.equal(""),
      );
      expect(styles.getPropertyValue("--space-1").trim()).to.equal("4px");
      expect(styles.getPropertyValue("--space-12").trim()).to.equal("48px");
      expect(styles.getPropertyValue("--radius-pill").trim()).to.equal("999px");
      expect(styles.getPropertyValue("--shadow-card")).to.contain("0 4px 16px");
      expect(styles.getPropertyValue("--shadow-raised")).to.contain(
        "0 12px 32px",
      );
    });
    cy.get(".status-color").should("have.length", 6);
  });

  it("matches all ten Figma typography styles", () => {
    const styles = [
      [".text-display-hero", "44px", "52px", "800", "-1px"],
      [".text-heading-h1", "32px", "40px", "700", "-0.5px"],
      [".text-heading-h2", "24px", "32px", "700", "-0.3px"],
      [".text-heading-h3", "18px", "26px", "600", "0"],
      [".text-body-large", "16px", "24px", "400", "0"],
      [".text-body-default", "14px", "22px", "400", "0"],
      [".text-body-strong", "14px", "22px", "600", "0"],
      [".text-caption-default", "12px", "16px", "500", "0"],
      [".text-caption-strong", "12px", "16px", "600", "0.2px"],
      [".text-label-button", "14px", "20px", "600", "0.1px"],
    ];
    styles.forEach(([selector, size, lineHeight, weight, letterSpacing]) => {
      cy.get(selector)
        .first()
        .should("have.css", "font-family")
        .and("include", "Plus Jakarta Sans");
      cy.get(selector)
        .first()
        .should("have.css", "font-size", size)
        .and("have.css", "line-height", lineHeight)
        .and("have.css", "font-weight", weight)
        .and("have.css", "letter-spacing", letterSpacing);
    });
  });

  it("matches the Foundations visual samples and desktop structure", () => {
    const statusColors = [
      "rgb(43, 122, 87)",
      "rgb(226, 243, 234)",
      "rgb(154, 100, 16)",
      "rgb(251, 240, 218)",
      "rgb(178, 58, 72)",
      "rgb(251, 229, 232)",
    ];
    statusColors.forEach((color, index) => {
      cy.get(".status-color")
        .eq(index)
        .should("have.css", "background-color", color);
    });
    [
      "Discover what’s on campus",
      "Events this month",
      "Registration list",
      "Career Fair: Meet Cluj Tech Companies",
      "Join student organizations and never miss an event.",
      "Registration closes on 12 November at 23:59.",
      "Societatea Hermes",
      "42 of 60 spots taken",
      "PUBLISHED",
      "Register for event",
    ].forEach((sample) => cy.contains(sample).should("be.visible"));
    cy.contains(
      "Muted, palette-harmonised tones used only for feedback states (published, pending, canceled).",
    ).should("be.visible");
    cy.contains("Cards, menus, dialogs").should("be.visible");
    cy.get(".spacing-row")
      .should("be.visible")
      .find(".spacing-demo")
      .should("have.length", 12);
    cy.viewport(1440, 1768);
    cy.get(".foundations-page").should(($page) => {
      const width = $page[0].getBoundingClientRect().width;
      expect(width).to.be.greaterThan(1400);
      expect(width).to.be.at.most(1440);
    });
    cy.get(".elevation-row").should("have.css", "display", "flex");
  });

  it("matches the Foundations frame geometry at desktop size", () => {
    cy.viewport(1440, 1768);
    const expected = [
      [".foundations-header", 80, 72],
      ["[aria-labelledby=brand-palette]", 216, 224],
      ["[aria-labelledby=status-colors]", 504, 240],
      ["[aria-labelledby=typography]", 808, 644],
      ["[aria-labelledby=elevation-radius]", 1516, 172],
    ];
    cy.get("h1, h2, p").each(($element) => {
      expect(getComputedStyle($element[0]).margin).to.equal("0px");
    });
    expected.forEach(([selector, top, height]) => {
      cy.get(selector).should(($element) => {
        const rect = $element[0].getBoundingClientRect();
        expect(Math.round(rect.top), selector).to.equal(top);
        expect(Math.round(rect.height), selector).to.equal(height);
      });
    });
    cy.get(".type-card").should(($card) => {
      expect(Math.round($card[0].getBoundingClientRect().width)).to.equal(886);
      expect(Math.round($card[0].getBoundingClientRect().height)).to.equal(592);
    });
  });

  it("keeps the Display/Hero sample on one line at desktop width", () => {
    cy.viewport(1440, 1768);
    cy.contains("Discover what’s on campus").should(($sample) => {
      const element = $sample[0];
      const style = getComputedStyle(element);
      expect(style.fontSize).to.equal("44px");
      expect(style.whiteSpace).to.equal("nowrap");
      expect(element.getClientRects().length).to.equal(1);
      expect(element.scrollWidth).to.be.at.most(element.clientWidth);
    });
  });
});
