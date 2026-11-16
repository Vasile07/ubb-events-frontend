describe("event form", () => {
  beforeEach(() => {
    cy.intercept("GET", "**/api/organizations/1/members", { body: [{ id: 7, fullName: "Ada Lovelace" }] }).as("members");
  });
  it("renders the create form and validates required fields", () => {
    cy.visit("/event-form-demo");
    cy.wait("@members");
    cy.get('[data-testid="event-form"]').should("exist");
    cy.contains("Event details").should("be.visible");
    cy.get('[data-testid="event-form-submit"]').click();
    cy.contains("Title is required").should("be.visible");
  });

  it("supports task rows and end-after-start validation", () => {
    cy.visit("/event-form-demo");
    cy.get('[data-testid="add-task"]').click();
    cy.get('[data-testid="task-row"]').should("have.length", 2);
    cy.get('[name="startDate"]').type("2026-12-01");
    cy.get('[name="startTime"]').type("18:00");
    cy.get('[name="endDate"]').type("2026-12-01");
    cy.get('[name="endTime"]').type("17:00");
    cy.get('[data-testid="event-form-submit"]').click();
    cy.contains("End must be after the start").should("be.visible");
  });

  it("shows member options, create cards, nested errors and preserves values", () => {
    cy.visit("/event-form-demo");
    cy.wait("@members");
    cy.get('[data-testid="event-lifecycle-card"]').should("contain", "Draft");
    cy.get('[data-testid="publish-checklist"]').should("contain", "Before you publish");
    cy.get('[name="title"]').type("Keep this title");
    cy.get('[name="tasks[0].description"]').type("Prepare room");
    cy.get('[name="tasks[0].assigneeId"]').find("option").should("contain", "Ada Lovelace");
    cy.get('[data-testid="event-form-submit"]').click();
    cy.get('[name="title"]').should("have.value", "Keep this title");
    cy.get('[name="tasks[0].description"]').should("have.value", "Prepare room");
  });

  it("renders edit cards and initial values", () => {
    cy.visit("/event-form-demo/edit");
    cy.get('[data-testid="event-information-card"]').should("be.visible");
    cy.get('[data-testid="current-status-card"]').should("contain", "Published");
    cy.get('[name="title"]').should("have.value", "Existing event");
    cy.get('[data-testid="task-row"]').should("not.exist");
  });

  it("shows explicit member loading, empty, and error states", () => {
    cy.intercept("GET", "**/api/organizations/1/members", (request) => { request.reply({ delay: 300, body: [] }); }).as("emptyMembers");
    cy.visit("/event-form-demo");
    cy.get('[data-testid="members-loading"]').should("be.visible");
    cy.wait("@emptyMembers");
    cy.get('[data-testid="members-empty"]').should("be.visible");

    cy.intercept("GET", "**/api/organizations/1/members", { statusCode: 500, body: { message: "failed" } }).as("failedMembers");
    cy.visit("/event-form-demo");
    cy.wait("@failedMembers");
    cy.get('[data-testid="members-error"]').should("be.visible");
  });

  it("maps nested backend task errors to rows and preserves the failed draft", () => {
    cy.visit("/event-form-demo?errors=1");
    cy.wait("@members");
    cy.get('[name="title"]').should("have.value", "Draft title");
    cy.get('[name="tasks[1].description"]').siblings(".ui-field-message-error").should("contain", "Add a task description");
    cy.get('[name="tasks[2].assigneeId"]').closest("label").should("contain", "Choose an assignee");
    cy.get('[data-testid="event-form-summary"]').should("contain", "Add a task description").and("contain", "Choose an assignee");
    cy.get('[name="title"]').should("have.value", "Draft title");
  });

  it("shows the backend edit capacity message and keeps the value", () => {
    cy.visit("/event-form-demo/edit?errors=1");
    cy.get('[name="capacity"]').should("have.value", "20");
    cy.get('[name="capacity"]').siblings(".ui-field-message-error").should("contain", "Capacity cannot be lower than active registrations (3)");
    cy.get('[data-testid="event-form-summary"]').should("contain", "active registrations");
  });
});
