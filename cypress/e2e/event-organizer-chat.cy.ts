describe("event organizer chat", () => {
  const ORG = "/api/organizations/3";
  const EVENT = `${ORG}/events/9`;
  const MESSAGES = `${EVENT}/messages`;
  const event = {
    id: 9, organizationId: 3, categoryId: 1, title: "Career Fair: Meet Cluj Tech Firms", description: "Fair",
    date: "2099-11-14", startTime: "18:00:00", endTime: "21:00:00", location: "Aula Magna", capacity: 60,
    status: "PUBLISHED", registrationCount: 0,
  };
  const members = [
    { id: 7, firstName: "Andrei", lastName: "Pop", email: "a@b.ro", role: "MANAGER" },
    { id: 2, firstName: "Maria", lastName: "Ionescu", email: "m@b.ro", role: "MEMBER" },
  ];
  const json = (status: number, body: unknown): Promise<Response> => Promise.resolve({
    ok: status >= 200 && status < 300, status, statusText: "", json: () => Promise.resolve(body),
  } as Response);

  function visitChat(currentEvent = event, messages: unknown[] = [], handler?: (url: string, init?: RequestInit) => Response | undefined) {
    const calls: { url: string; method: string; body?: unknown }[] = [];
    cy.visit("/org/3/events/9/chat", { onBeforeLoad(win) {
      win.localStorage.clear();
      win.localStorage.setItem("token", "jwt");
      cy.stub(win, "fetch").callsFake((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        calls.push({ url, method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : undefined });
        const custom = handler?.(url, init);
        if (custom) return Promise.resolve(custom);
        if (url.endsWith("/api/users/me")) return json(200, { id: 7, firstName: "Andrei", lastName: "Pop", email: "a@b.ro", memberships: [{ organizationId: 3, role: "MANAGER" }] });
        if (url.endsWith(ORG) && !url.endsWith("/members")) return json(200, { organizationId: 3, name: "Societatea Hermes", description: null, role: "MANAGER", status: "MEMBER" });
        if (url.endsWith(EVENT)) return json(200, currentEvent);
        if (url.endsWith(`${ORG}/members`)) return json(200, members);
        if (url.endsWith(MESSAGES) && (init?.method ?? "GET") === "GET") return json(200, messages);
        return json(200, []);
      });
    }});
    return calls;
  }

  it("renders the private conversation and sender-aligned messages", () => {
    visitChat(event, [
      { id: 1, senderId: 2, content: "Please review the schedule.", sentAt: "2099-11-14T10:12:00Z" },
      { id: 2, senderId: 7, content: "I will take a look.", sentAt: "2099-11-14T10:15:00Z" },
    ]);
    cy.get("[data-testid=event-organizer-chat]").should("be.visible");
    cy.contains("Organizer conversation").should("be.visible");
    cy.contains("Not visible to participants").should("be.visible");
    cy.get("[data-testid=chat-message-1]").should("have.class", "is-other").and("contain.text", "Maria Ionescu");
    cy.get("[data-testid=chat-message-2]").should("have.class", "is-current").and("contain.text", "Andrei Pop");
  });

  it("shows an empty state and disables the composer for canceled events", () => {
    visitChat({ ...event, status: "CANCELED" }, []);
    cy.contains("No messages yet").should("be.visible");
    cy.get("[data-testid=chat-composer] textarea").should("be.disabled");
  });

  it("retries a failed GET and submits a trimmed message", () => {
    let getAttempts = 0;
    let sent: unknown;
    const calls = visitChat(event, [], (url, init) => {
      if (url.endsWith(MESSAGES) && (init?.method ?? "GET") === "GET" && ++getAttempts <= 3) return { ok: false, status: 500, statusText: "Server error", json: () => Promise.resolve({ message: "Temporary failure" }) } as Response;
      if (url.endsWith(MESSAGES) && init?.method === "POST") { sent = JSON.parse(String(init.body)); return { ok: true, status: 201, statusText: "", json: () => Promise.resolve({ id: 3, senderId: 7, content: "Hello", sentAt: null }) } as Response; }
      return undefined;
    });
    cy.contains("Could not load the conversation.").should("be.visible");
    cy.contains("Retry").click();
    cy.get("#event-organizer-chat-input").type("  Hello  ");
    cy.get("#event-organizer-chat-input").type("{enter}");
    cy.wrap(null).should(() => expect(sent).to.deep.equal({ content: "Hello" }));
    cy.wrap(null).should(() => expect(calls.filter((call) => call.url.endsWith(MESSAGES) && call.method === "GET").length).to.be.greaterThan(1));
  });

  it("retains a failed draft, shows the near-limit counter, and distinguishes Enter from Shift+Enter", () => {
    const calls = visitChat(event, [], (url, init) => url.endsWith(MESSAGES) && init?.method === "POST"
      ? { ok: false, status: 409, statusText: "Conflict", json: () => Promise.resolve({ message: "A canceled event cannot receive messages" }) } as Response
      : undefined);
    cy.get("#event-organizer-chat-input").type("a".repeat(900), { delay: 0 });
    cy.contains("900/1000").should("be.visible");
    cy.get("#event-organizer-chat-input").type("{shift}{enter}");
    cy.get("#event-organizer-chat-input").should("have.value", `${"a".repeat(900)}\n`);
    cy.get("#event-organizer-chat-input").type("{enter}");
    cy.contains("A canceled event cannot receive messages").should("be.visible");
    cy.get("#event-organizer-chat-input").should("have.value", `${"a".repeat(900)}\n`);
    cy.wrap(null).should(() => expect(calls.filter((call) => call.url.endsWith(MESSAGES) && call.method === "POST")).to.have.length(1));
  });

  it("polls new messages and keeps the message viewport accessible", () => {
    let messages: unknown[] = Array.from({ length: 20 }, (_, index) => ({ id: index + 1, senderId: 2, content: `Message ${index + 1}`, sentAt: null }));
    visitChat(event, messages, (url) => {
      if (url.endsWith(MESSAGES)) return { ok: true, status: 200, statusText: "", json: () => Promise.resolve(messages) } as Response;
      return undefined;
    });
    cy.get("[aria-label='Conversation messages']").should(($element) => {
      expect($element[0].scrollTop).to.be.greaterThan(0);
    });
    cy.get("[aria-label='Conversation messages']").scrollTo("top");
    cy.then(() => { messages = [...messages, { id: 21, senderId: 2, content: "Polled update", sentAt: null }]; });
    cy.wait(5200);
    cy.contains("Polled update").should("be.visible");
    cy.get("[aria-label='Conversation messages']").should(($element) => expect($element[0].scrollTop).to.equal(0));
    cy.get("[aria-label='Conversation messages']").scrollTo("bottom");
    cy.then(() => { messages = [...messages, { id: 22, senderId: 2, content: "Bottom update", sentAt: null }]; });
    cy.wait(5200);
    cy.contains("Bottom update").should("be.visible");
    cy.get("[aria-label='Conversation messages']").should(($element) => {
      const viewport = $element[0];
      expect(viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight).to.be.lessThan(48);
    });
    cy.get("[aria-label='Conversation messages']").should("have.attr", "aria-label", "Conversation messages");
  });
});
