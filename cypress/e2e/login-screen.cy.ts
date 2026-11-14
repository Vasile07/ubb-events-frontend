describe("login screen", () => {
  type FetchHandler = (url: string, init?: RequestInit) => Promise<Response>;

  const json = (status: number, body: unknown): Promise<Response> =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      statusText: "",
      json: () => Promise.resolve(body),
    } as Response);

  const profile = {
    id: 7,
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    memberships: [],
  };

  // Default backend: login succeeds, the profile loads, every other call returns an empty list.
  const successfulBackend: FetchHandler = (url) => {
    if (url.endsWith("/api/auth/login")) return json(200, { token: "jwt" });
    if (url.endsWith("/api/users/me")) return json(200, profile);
    return json(200, []);
  };

  const visitAnonymous = (
    path: string,
    handler: FetchHandler = successfulBackend,
    historyState?: unknown,
  ) => {
    cy.visit(path, {
      onBeforeLoad(win) {
        win.localStorage.clear();
        if (historyState) win.history.replaceState(historyState, "", path);
        cy.stub(win, "fetch")
          .as("fetch")
          .callsFake((input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init));
      },
    });
  };

  const loginCalls = () =>
    cy.get<sinon.SinonStub>("@fetch").then((stub) =>
      stub.getCalls().filter((call) => String(call.args[0]).endsWith("/api/auth/login")),
    );

  const fillAndSubmit = (email: string, password: string) => {
    if (email) cy.get("[data-testid=login-email]").type(email);
    if (password) cy.get("[data-testid=login-password]").type(password);
    cy.get("[data-testid=login-submit]").click();
  };

  it("renders the login form from the design", () => {
    visitAnonymous("/login");

    cy.get("[data-testid=page-login]").should("be.visible");
    cy.get(".ui-auth-layout").should("exist");
    cy.contains("h2", "Welcome back").should("be.visible");
    cy.contains("Sign in to see your events and organizations.").should("be.visible");
    cy.get("[data-testid=login-email]")
      .should("have.attr", "type", "email")
      .and("have.attr", "placeholder", "you@stud.ubbcluj.ro");
    cy.get("label").contains("Email").should("be.visible");
    cy.get("[data-testid=login-password]")
      .should("have.attr", "type", "password")
      .and("have.attr", "placeholder", "••••••••");
    cy.get("label").contains("Password").should("be.visible");
    cy.get("[data-testid=login-submit]").should("contain.text", "Sign in").and("be.enabled");
    cy.contains("New to UBB Events?").should("be.visible");
    cy.contains("a", "Create an account").should("have.attr", "href", "/register");
  });

  it("signs in and returns to the originally requested route", () => {
    visitAnonymous("/my-tasks");
    cy.location("pathname").should("eq", "/login");

    fillAndSubmit("ada@example.com", "secret");

    cy.location("pathname").should("eq", "/my-tasks");
    cy.get("[data-testid=page-my-tasks]").should("be.visible");
    cy.window().its("localStorage.token").should("eq", "jwt");
    loginCalls().then((calls) => {
      expect(calls).to.have.length(1);
      expect(JSON.parse(String(calls[0].args[1]?.body))).to.deep.equal({
        email: "ada@example.com",
        password: "secret",
      });
    });
  });

  it("signs in and goes to /events when there is no remembered route", () => {
    visitAnonymous("/login");
    fillAndSubmit("ada@example.com", "secret");
    cy.location("pathname").should("eq", "/events");
  });

  it("navigates to /register from the create account link", () => {
    visitAnonymous("/login");
    cy.contains("a", "Create an account").click();
    cy.location("pathname").should("eq", "/register");
  });

  it("validates required fields and email format without calling the API", () => {
    visitAnonymous("/login");

    cy.get("[data-testid=login-submit]").click();
    cy.contains("Email is required").should("be.visible");
    cy.contains("Password is required").should("be.visible");
    cy.get("[data-testid=login-email]").should("have.attr", "aria-invalid", "true");
    cy.get("[data-testid=login-password]").should("have.attr", "aria-invalid", "true");
    cy.get("[data-testid=login-email]")
      .invoke("attr", "aria-describedby")
      .then((describedBy) => {
        cy.get(`#${String(describedBy).split(" ").pop()}`).should("contain.text", "Email is required");
      });

    cy.get("[data-testid=login-email]").type("ana@");
    cy.get("[data-testid=login-password]").type("secret");
    cy.get("[data-testid=login-submit]").click();
    cy.contains("Enter a valid email address").should("be.visible");
    cy.contains("Password is required").should("not.exist");

    loginCalls().should("have.length", 0);
    cy.location("pathname").should("eq", "/login");
  });

  it("does not apply password complexity rules on login", () => {
    visitAnonymous("/login");
    fillAndSubmit("ada@example.com", "abc");

    cy.location("pathname").should("eq", "/events");
    loginCalls().then((calls) => {
      expect(JSON.parse(String(calls[0].args[1]?.body)).password).to.equal("abc");
    });
  });

  it("shows invalid credentials as the form error state", () => {
    visitAnonymous("/login", (url) => {
      if (url.endsWith("/api/auth/login")) {
        return json(401, { status: 401, message: "Invalid email or password", errors: [] });
      }
      return json(200, []);
    });

    fillAndSubmit("ada@example.com", "wrong-password");

    cy.contains("Invalid email or password").should("be.visible");
    cy.get("[data-testid=login-email]").should("have.attr", "aria-invalid", "true").and("have.value", "ada@example.com");
    cy.get("[data-testid=login-password]").should("have.attr", "aria-invalid", "true").and("have.value", "wrong-password");
    cy.get("[data-testid=toast-error]").should("not.exist");
    cy.get("[data-testid=login-submit]").should("be.enabled");
    cy.location("pathname").should("eq", "/login");
  });

  it("shows a toast when the network fails", () => {
    visitAnonymous("/login", (url) => {
      if (url.endsWith("/api/auth/login")) return Promise.reject(new TypeError("Failed to fetch"));
      return json(200, []);
    });

    fillAndSubmit("ada@example.com", "secret");

    cy.get("[data-testid=toast-error]")
      .should("be.visible")
      .and("contain.text", "Couldn't sign in")
      .and("contain.text", "Check your connection and try again.");
    cy.get("[data-testid=login-email]").should("have.value", "ada@example.com");
    cy.get("[data-testid=login-submit]").should("be.enabled");
    cy.location("pathname").should("eq", "/login");
  });

  it("disables the button with a loading state while submitting", () => {
    visitAnonymous("/login", (url) => {
      if (url.endsWith("/api/auth/login")) return new Promise<Response>(() => undefined);
      return json(200, []);
    });

    fillAndSubmit("ada@example.com", "secret");

    cy.get("[data-testid=login-submit]")
      .should("be.disabled")
      .and("have.attr", "aria-busy", "true")
      .and("contain.text", "Loading…");
    cy.get("[data-testid=login-submit]").click({ force: true });
    cy.get("form").submit();
    loginCalls().should("have.length", 1);
  });

  it("keeps unsafe remembered routes out of the redirect", () => {
    visitAnonymous("/login", successfulBackend, {
      usr: { from: "//evil.example.com/steal" },
      key: "default",
      idx: 0,
    });

    fillAndSubmit("ada@example.com", "secret");

    cy.location("pathname").should("eq", "/events");
    cy.location("host").should("not.contain", "evil.example.com");
  });
});
