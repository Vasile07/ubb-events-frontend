const userProfile = {
  id: 7,
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  memberships: [],
};

const eventDetails = {
  id: 1,
  title: "Open campus hackathon",
  description: "Build useful tools with other students.",
  organization: { id: 7, name: "Robotics" },
  date: "2099-11-21",
  startTime: "18:00:00",
  endTime: "20:00:00",
  location: "Aula Magna",
  capacity: 60,
  registrationCount: 42,
  registrationAvailable: true,
  status: "PUBLISHED",
  registrationStatus: "NOT_REGISTERED",
};

function response(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as Response;
}

type Announcement = { id: number; eventId: number; title: string; content: string };

function visitDetails(overrides: Partial<typeof eventDetails> = {}, options: { announcementsStatus?: number; registerStatus?: number; announcements?: Announcement[] } = {}) {
  let currentEvent = { ...eventDetails, ...overrides };
  cy.visit("/events/1", {
    onBeforeLoad(win) {
      win.localStorage.setItem("token", "test-token");
      cy.stub(win, "fetch").callsFake((input, init) => {
        const url = new URL(String(input));
        if (url.pathname.endsWith("/api/users/me")) return Promise.resolve(response(userProfile));
        if (url.pathname.endsWith("/api/events/1/registrations") && init?.method === "POST") {
          if (options.registerStatus === 409) {
            currentEvent = { ...currentEvent, registrationStatus: "REGISTERED", registrationCount: currentEvent.registrationCount + 1 };
            return Promise.resolve(response({ status: 409, message: "User is already registered", errors: [] }, 409));
          }
          currentEvent = { ...currentEvent, registrationStatus: "REGISTERED", registrationCount: currentEvent.registrationCount + 1 };
          return Promise.resolve(response({ id: 12, eventId: 1, userId: 7 }, 201));
        }
        if (url.pathname.endsWith("/api/events/1/registrations/me") && init?.method === "DELETE") { currentEvent = { ...currentEvent, registrationStatus: "NOT_REGISTERED", registrationCount: Math.max(0, currentEvent.registrationCount - 1) }; return Promise.resolve(response(undefined, 204)); }
        if (url.pathname.endsWith("/api/events/1")) return Promise.resolve(response(currentEvent));
        if (url.pathname.endsWith("/api/events/1/announcements")) return Promise.resolve(response(options.announcementsStatus === 403 ? {} : options.announcements ?? [], options.announcementsStatus ?? 200));
        return Promise.resolve(response([]));
      });
    },
  });
}

describe("participant event details", () => {
  it("renders the event information and registration card", () => {
    visitDetails();
    cy.get("[data-testid=event-details-page]").should("be.visible");
    cy.contains("Open campus hackathon").should("be.visible");
    cy.contains("About this event").should("be.visible");
    cy.get("[data-testid=registration-card]").should("contain", "42 of 60 places taken");
    cy.get("[data-testid=register-event]").should("be.enabled");
  });

  it("renders the registered state and announcements card", () => {
    visitDetails({ registrationStatus: "REGISTERED" });
    cy.get("[data-testid=cancel-registration]").should("be.visible");
    cy.get("[data-testid=announcements-card]").should("be.visible");
  });

  it("hides announcements when the announcements endpoint returns 403", () => {
    visitDetails({ registrationStatus: "REGISTERED" }, { announcementsStatus: 403 });
    cy.get("[data-testid=announcements-card]").should("not.exist");
  });

  it("renders announcement titles and content from the API response", () => {
    visitDetails({ registrationStatus: "REGISTERED" }, { announcements: [{ id: 11, eventId: 1, title: "Venue update", content: "Meet in room 204." }] });
    cy.get("[data-testid=announcements-card]").should("contain", "Venue update").and("contain", "Meet in room 204.");
  });

  it("keeps terminal event actions disabled", () => {
    visitDetails({ date: "2000-01-01", endTime: "20:00:00" });
    cy.get("[data-testid=register-event]").should("be.disabled").and("contain", "unavailable");
    visitDetails({ status: "CANCELED" });
    cy.get("[data-testid=register-event]").should("be.disabled");
  });

  it("registers optimistically and confirms cancellation", () => {
    visitDetails();
    cy.get("[data-testid=register-event]").click();
    cy.get("[data-testid=cancel-registration]").should("be.visible");
    cy.get("[data-testid=toast-region]").should("contain", "Registration confirmed");
    cy.get("[data-testid=cancel-registration]").click();
    cy.get("[role=dialog]").should("be.visible").contains("Cancel registration?");
    cy.get("[role=dialog]").find("button").contains("Cancel registration").click();
    cy.get("[data-testid=toast-region]").should("contain", "Registration canceled");
  });

  it("refetches and shows the current registered state after a 409", () => {
    visitDetails({}, { registerStatus: 409 });
    cy.get("[data-testid=register-event]").click();
    cy.get("[data-testid=cancel-registration]").should("be.visible");
    cy.contains("Registered").should("be.visible");
  });

  it("disables registration for full, completed, and canceled events", () => {
    visitDetails({ registrationAvailable: false, registrationStatus: "NOT_REGISTERED" });
    cy.get("[data-testid=register-event]").should("be.disabled");
    cy.get("[data-testid=registration-progress]").should("have.attr", "role", "progressbar").and("have.attr", "aria-valuenow", "42");
  });

  it("does not allow cancellation after an event has started", () => {
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const started = new Date(now.getTime() - 60_000).toTimeString().slice(0, 8);
    const ending = new Date(now.getTime() + 3_600_000).toTimeString().slice(0, 8);
    visitDetails({ date, startTime: started, endTime: ending, registrationStatus: "REGISTERED" });
    cy.get("[data-testid=cancel-registration]").should("be.disabled");
    cy.contains("already started").should("be.visible");
  });
});
