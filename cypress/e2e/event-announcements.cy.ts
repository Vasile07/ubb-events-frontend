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
  status: "PUBLISHED",
  registrationCount: 4,
};

const announcements = [
  { id: 2, eventId: 42, title: "Doors open", content: "Meet at the entrance." },
  { id: 7, eventId: 42, title: "Room changed", content: "We are now in room 204." },
];

function visitAnnouncements(eventBody = event, options: { delayMs?: number; delayAnnouncementsMs?: number; failEvent?: boolean; failAnnouncements?: boolean; failPost?: boolean; empty?: boolean } = {}) {
  cy.visit("/org/3/events/42/announcements", {
    onBeforeLoad(win) {
      win.localStorage.setItem("token", "jwt");
      win.fetch = cy.stub().callsFake((input, init) => {
        const path = new URL(String(input)).pathname.replace(/\/+$/, "");
        if (path.endsWith("/api/users/me")) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ id: 7, firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", memberships: [{ organizationId: 3, role: "MANAGER" }] }) } as Response);
        if (path.endsWith("/api/organizations/3")) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ organizationId: 3, name: "Hermes", description: "Business", status: "MEMBER", role: "MANAGER" }) } as Response);
        if (path.endsWith("/api/organizations/3/events/42")) {
          const result = { ok: !options.failEvent, status: options.failEvent ? 503 : 200, json: () => Promise.resolve(options.failEvent ? { message: "Unavailable" } : eventBody) } as Response;
          return options.delayMs ? new Promise((resolve) => win.setTimeout(() => resolve(result), options.delayMs)) : Promise.resolve(result);
        }
        if (path.endsWith("/api/events/42/announcements")) { const result = { ok: !options.failAnnouncements, status: options.failAnnouncements ? 503 : 200, json: () => Promise.resolve(options.failAnnouncements ? { message: "Unavailable" } : options.empty ? [] : announcements) } as Response; return options.delayAnnouncementsMs ? new Promise((resolve) => win.setTimeout(() => resolve(result), options.delayAnnouncementsMs)) : Promise.resolve(result); }
        if (path.endsWith("/api/organizations/3/events/42/announcements") && init?.method === "POST") return Promise.resolve({ ok: !options.failPost, status: options.failPost ? 400 : 201, json: () => Promise.resolve(options.failPost ? { status: 400, message: "Announcement could not be published" } : { id: 8, eventId: 42, title: "New update", content: "Published content" }) } as Response);
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) } as Response);
      }) as typeof fetch;
    },
  });
}

describe("event announcements", () => {
  it("renders newest announcements first and publishes a new announcement", () => {
    visitAnnouncements();
    cy.get("[data-testid=event-announcements-page]").should("be.visible");
    cy.get("[data-testid=announcement-item]").first().should("contain", "Room changed");
    cy.get("[data-testid=announcement-item]").last().should("contain", "Doors open");
    cy.get("[data-testid=announcement-title]").type("New update");
    cy.get("[data-testid=announcement-content]").type("Published content");
    cy.contains("button", "Publish announcement").click();
    cy.get("[data-testid=toast-success]").should("contain", "Announcement published");
    cy.get("[data-testid=announcement-title]").should("have.value", "");
    cy.get("[data-testid=announcement-content]").should("have.value", "");
  });

  it("validates required fields and disables the composer for canceled events", () => {
    visitAnnouncements();
    cy.contains("button", "Publish announcement").click();
    cy.get("[role=alert]").should("contain", "Title and content are required");
    visitAnnouncements({ ...event, status: "CANCELED" });
    cy.get("[data-testid=announcement-composer]").should("be.visible");
    cy.get("[data-testid=announcement-title]").should("be.disabled");
    cy.contains("This event is canceled. Announcements are disabled.").should("be.visible");
  });

  it("shows loading and empty states", () => {
    visitAnnouncements(event, { delayAnnouncementsMs: 1200 });
    cy.get("[data-testid=event-announcements-loading]").should("be.visible");
    visitAnnouncements(event, { empty: true });
    cy.get("[data-testid=event-announcements-empty]").should("contain", "No announcements yet");
  });

  it("retries an announcement load error", () => {
    let attempts = 0;
    cy.visit("/org/3/events/42/announcements", { onBeforeLoad(win) {
      win.localStorage.setItem("token", "jwt");
      win.fetch = cy.stub().callsFake((input) => {
        const path = new URL(String(input)).pathname.replace(/\/+$/, "");
        if (path.endsWith("/api/users/me")) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ id: 7, firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", memberships: [{ organizationId: 3, role: "MANAGER" }] }) } as Response);
        if (path.endsWith("/api/organizations/3")) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ organizationId: 3, name: "Hermes", description: "Business", status: "MEMBER", role: "MANAGER" }) } as Response);
        if (path.endsWith("/api/organizations/3/events/42")) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(event) } as Response);
        if (path.endsWith("/api/events/42/announcements")) { attempts += 1; return Promise.resolve({ ok: attempts > 3, status: attempts > 3 ? 200 : 503, json: () => Promise.resolve(attempts > 3 ? announcements : { message: "Unavailable" }) } as Response); }
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) } as Response);
      }) as typeof fetch;
    }});
    cy.get("[data-testid=event-announcements-error]").should("be.visible");
    cy.contains("button", "Retry").click();
    cy.get("[data-testid=announcement-item]").should("have.length", 2);
  });

  it("sends the publish payload and retains the draft after a failed POST", () => {
    visitAnnouncements(event, { failPost: true });
    cy.get("[data-testid=announcement-title]").type("Failed update");
    cy.get("[data-testid=announcement-content]").type("Keep this draft");
    cy.contains("button", "Publish announcement").click();
    cy.get("[role=alert]").should("contain", "Announcement could not be published");
    cy.get("[data-testid=announcement-title]").should("have.value", "Failed update");
    cy.get("[data-testid=announcement-content]").should("have.value", "Keep this draft");
    cy.window().then((win) => {
      const post = (win.fetch as unknown as Cypress.SinonStub).getCalls().find((call) => call.args[1]?.method === "POST");
      expect(post).to.exist;
      expect(post?.args[0]).to.contain("/api/organizations/3/events/42/announcements");
      expect(JSON.parse(String(post?.args[1]?.body))).to.deep.equal({ title: "Failed update", content: "Keep this draft" });
    });
  });
});
