describe("my registrations screen", () => {
  const response = (status: number, body: unknown): Promise<Response> => Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: "",
    json: () => Promise.resolve(body),
  } as Response);

  const registrations = [
    { registrationId: 1, event: { id: 10, title: "Career Fair", date: "2099-11-22", startTime: "18:00:00", endTime: "20:00:00", location: "Aula Magna", status: "PUBLISHED", organization: { id: 1, name: "Societatea Hermes" } } },
    { registrationId: 2, event: { id: 20, title: "Canceled meetup", date: "2026-12-05", startTime: "10:00:00", endTime: "12:00:00", location: "Main hall", status: "CANCELED", organization: { id: 2, name: "Photo Club UBB" } } },
    { registrationId: 3, event: { id: 30, title: "Past workshop", date: "2020-01-05", startTime: "10:00:00", endTime: "12:00:00", location: "Room 1", status: "PUBLISHED", organization: { id: 1, name: "Societatea Hermes" } } },
  ];

  const visit = (fetchHandler: (url: string, init?: RequestInit) => Promise<Response>) => cy.visit("/my-registrations", {
    onBeforeLoad(win) {
      win.localStorage.clear();
      win.localStorage.setItem("token", "jwt");
      cy.stub(win, "fetch").as("fetch").callsFake((input: RequestInfo | URL, init?: RequestInit) => fetchHandler(String(input), init));
    },
  });

  it("renders tabs, counts, rows and organizer-canceled status", () => {
    visit((url) => url.endsWith("/api/users/me") ? response(200, { id: 7, firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", memberships: [] }) : response(200, registrations));
    cy.get("[data-testid=my-registrations-page]").should("be.visible");
    cy.contains("h1", "My registrations");
    cy.contains("Active · 1"); cy.contains("Canceled · 1"); cy.contains("Past · 1");
    cy.get("[data-testid=registration-row-10]").should("contain.text", "Career Fair").and("contain.text", "Societatea Hermes");
    cy.get("[role=tab]").contains("Canceled").click();
    cy.get("[data-testid=registration-row-20]").should("contain.text", "Canceled").and("contain.text", "Photo Club UBB");
    cy.get("[data-testid=registration-row-20]").contains("button", "Cancel registration").should("not.exist");
  });

  it("confirms cancellation and deletes the active registration", () => {
    let deleted = false;
    let current = [...registrations];
    visit((url, init) => {
      if (url.endsWith("/api/users/me")) return response(200, { id: 7, firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", memberships: [] });
      if (url.endsWith("/api/events/10/registrations/me") && init?.method === "DELETE") { deleted = true; current = current.filter((item) => item.event.id !== 10); return response(204, undefined); }
      return response(200, current);
    });
    cy.get("[data-testid=registration-row-10]").contains("button", "Cancel registration").click();
    cy.contains("Cancel registration?").should("be.visible");
    cy.get("[role=dialog]").contains("button", "Cancel registration").click();
    cy.wrap(null).should(() => expect(deleted).to.equal(true));
    cy.get("[data-testid=toast-region]").should("contain.text", "Registration canceled");
    cy.get("[data-testid=registration-row-10]").should("not.exist");
    cy.get("[role=tab]").contains("Canceled").click();
    cy.get("[data-testid=registration-row-10]").should("not.exist");
    cy.get("[role=tab]").contains("Past").click();
    cy.get("[data-testid=registration-row-10]").should("not.exist");
  });

  it("shows empty and retryable error states", () => {
    let attempts = 0;
    visit((url) => {
      if (url.endsWith("/api/users/me")) return response(200, { id: 7, firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", memberships: [] });
      attempts += 1;
      return attempts < 3 ? response(500, { message: "Unexpected server error", errors: [] }) : response(200, []);
    });
    cy.get("[data-testid=my-registrations-error]", { timeout: 10000 }).should("be.visible");
    cy.get("[data-testid=my-registrations-retry]").click();
    cy.get("[data-testid=my-registrations-empty]").should("contain.text", "Discover events");
  });

  it("renders distinct empty states for each tab", () => {
    visit((url) => url.endsWith("/api/users/me") ? response(200, { id: 7, firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", memberships: [] }) : response(200, []));
    cy.get("[data-testid=my-registrations-empty]").should("contain.text", "No active registrations");
    cy.get("[role=tab]").contains("Canceled").click();
    cy.get("[data-testid=my-registrations-empty]").should("contain.text", "No canceled registrations");
    cy.get("[role=tab]").contains("Past").click();
    cy.get("[data-testid=my-registrations-empty]").should("contain.text", "No past registrations");
    cy.get("[data-testid=my-registrations-empty]").contains("Discover events").should("be.visible");
  });

  it("shows the loading skeleton while registrations are pending", () => {
    visit((url) => url.endsWith("/api/users/me") ? response(200, { id: 7, firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", memberships: [] }) : new Promise<Response>(() => undefined));
    cy.get("[data-testid=my-registrations-skeleton]").should("be.visible").and("have.attr", "aria-busy", "true");
  });

  it("supports semantic tab keyboard navigation and View event navigation", () => {
    visit((url) => url.endsWith("/api/users/me") ? response(200, { id: 7, firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", memberships: [] }) : response(200, registrations));
    cy.get("[role=tablist]").should("have.attr", "aria-label", "Registration status");
    cy.get("[role=tab]").should("have.length", 3).eq(1).focus().should("have.focus").click().should("have.attr", "aria-selected", "true");
    cy.get("[role=tab]").first().click();
    cy.get("[data-testid=registration-row-10]").contains("a", "View event").click();
    cy.location("pathname").should("eq", "/events/10");
  });
});
