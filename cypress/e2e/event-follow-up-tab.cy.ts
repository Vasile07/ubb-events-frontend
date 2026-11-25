const event = {
  id: 42,
  organizationId: 3,
  categoryId: 1,
  title: "Campus night",
  description: "An evening event",
  date: "2026-11-20",
  startTime: "18:00:00",
  endTime: "21:30:00",
  location: "Main hall",
  capacity: 120,
  status: "COMPLETED",
  registrationCount: 4,
};

function visitFollowUp(options: { followUp?: { id: number; eventId: number; content: string } | null; member?: boolean; event?: Partial<typeof event>; registrations?: unknown[]; tasks?: unknown[]; announcements?: unknown[]; failFollowUp?: boolean; failPost?: boolean } = {}) {
  const followUp = options.followUp === undefined ? null : options.followUp;
  const eventBody = { ...event, ...options.event };
  cy.visit("/org/3/events/42/follow-up", {
    onBeforeLoad(win) {
      win.localStorage.setItem("token", "jwt");
      win.fetch = cy.stub().callsFake((input, init) => {
        const path = new URL(String(input)).pathname.replace(/\/+$/, "");
        if (path.endsWith("/api/users/me")) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ id: 7, firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", memberships: options.member ? [{ organizationId: 3, role: "MEMBER" }] : [{ organizationId: 3, role: "MANAGER" }] }) } as Response);
        if (path.endsWith("/api/organizations/3")) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ organizationId: 3, name: "Hermes", description: "Business", status: "MEMBER", role: options.member ? "MEMBER" : "MANAGER" }) } as Response);
        if (path.endsWith("/api/organizations/3/events/42")) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(eventBody) } as Response);
        if (path.endsWith("/api/organizations/3/events/42/follow-up")) {
          if (init?.method === "POST") return options.failPost ? Promise.resolve({ ok: false, status: 400, json: () => Promise.resolve({ status: 400, message: "Validation failed", errors: [{ field: "content", message: "content is required" }] }) } as Response) : Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({ id: 9, eventId: 42, content: "Great event" }) } as Response);
          if (options.failFollowUp) return Promise.resolve({ ok: false, status: 503, json: () => Promise.resolve({ status: 503, message: "Follow-up unavailable", errors: [] }) } as Response);
          return followUp ? Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(followUp) } as Response) : Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({ status: 404, message: "Follow-up not found", errors: [] }) } as Response);
        }
        if (path.endsWith("/registrations")) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(options.registrations ?? []) } as Response);
        if (path.endsWith("/tasks")) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(options.tasks ?? []) } as Response);
        if (path.endsWith("/announcements")) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(options.announcements ?? []) } as Response);
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) } as Response);
      }) as typeof fetch;
    },
  });
}

describe("event follow-up", () => {
  it("shows the empty manager form, posts content and displays the saved read view", () => {
    visitFollowUp();
    cy.get("[data-testid=event-follow-up-page]").should("be.visible");
    cy.get("[data-testid=follow-up-content]").type("Great event");
    cy.contains("button", "Save follow-up").click();
    cy.get("[data-testid=toast-success]").should("contain", "Follow-up saved");
    cy.contains("Great event").should("be.visible");
    cy.contains("Editing is not available").should("be.visible");
    cy.window().then((win) => {
      const post = (win.fetch as unknown as Cypress.SinonStub).getCalls().find((call) => call.args[1]?.method === "POST");
      expect(post).to.exist;
      expect(JSON.parse(String(post?.args[1]?.body))).to.deep.equal({ content: "Great event" });
    });
  });

  it("renders a saved follow-up read-only for members", () => {
    visitFollowUp({ member: true, followUp: { id: 9, eventId: 42, content: "Already recorded" } });
    cy.contains("Already recorded").should("be.visible");
    cy.get("[data-testid=follow-up-content]").should("not.exist");
    cy.contains("Editing is not available").should("be.visible");
  });

  it("shows recap counts, required-content validation, and an accessible locked state before the event ends", () => {
    visitFollowUp({ event: { date: "2099-11-20", endTime: "21:30:00" }, registrations: [{ firstName: "A", lastName: "B", email: "a@b.test" }], tasks: [{ id: 1 }], announcements: [{ id: 1 }] });
    cy.get("[data-testid=recap-registrations]").should("contain", "1");
    cy.get("[data-testid=recap-tasks]").should("contain", "1");
    cy.get("[data-testid=recap-announcements]").should("contain", "1");
    cy.get("[data-testid=follow-up-locked]").should("have.attr", "data-testid");
    cy.contains("unlocks after the event has ended").should("be.visible");
  });

  it("keeps the form locked when the event has no end time", () => {
    visitFollowUp({ event: { date: "2020-11-20", endTime: null } });
    cy.get("[data-testid=follow-up-locked]").should("be.visible");
  });

  it("validates empty content before posting", () => {
    visitFollowUp();
    cy.contains("button", "Save follow-up").click();
    cy.get("[role=alert]").should("contain", "Content is required");
  });

  it("shows structured content validation errors returned by the API", () => {
    visitFollowUp({ failPost: true });
    cy.get("[data-testid=follow-up-content]").type("Draft");
    cy.contains("button", "Save follow-up").click();
    cy.get("[data-testid=follow-up-content]").should("have.attr", "aria-invalid", "true");
    cy.contains("content is required").should("be.visible");
  });

  it("shows a retryable error when the follow-up request fails", () => {
    visitFollowUp({ failFollowUp: true });
    cy.get("[data-testid=event-follow-up-error]").should("contain", "Could not load event follow-up");
  });

  it("keeps a member with no saved follow-up in an empty read-only state", () => {
    visitFollowUp({ member: true });
    cy.get("[data-testid=follow-up-locked]").should("be.visible");
    cy.get("[data-testid=follow-up-content]").should("not.exist");
  });
});
