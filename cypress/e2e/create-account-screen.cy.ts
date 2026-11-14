describe("create account screen", () => {
  type FetchHandler = (url: string, init?: RequestInit) => Promise<Response>;

  const json = (status: number, body: unknown): Promise<Response> =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      statusText: "",
      json: () => Promise.resolve(body),
    } as Response);

  const created = { id: 9, firstName: "Andrei", lastName: "Pop", email: "andrei.pop@stud.ubbcluj.ro" };
  const profile = { ...created, memberships: [] };

  // Default backend: register succeeds, login succeeds, the profile loads, every other call returns an empty list.
  const successfulBackend: FetchHandler = (url) => {
    if (url.endsWith("/api/auth/register")) return json(201, created);
    if (url.endsWith("/api/auth/login")) return json(200, { token: "jwt" });
    if (url.endsWith("/api/users/me")) return json(200, profile);
    return json(200, []);
  };

  const backendWithRegister = (register: () => Promise<Response>): FetchHandler => (url, init) =>
    url.endsWith("/api/auth/register") ? register() : successfulBackend(url, init);

  const visitRegister = (handler: FetchHandler = successfulBackend) => {
    cy.visit("/register", {
      onBeforeLoad(win) {
        win.localStorage.clear();
        cy.stub(win, "fetch")
          .as("fetch")
          .callsFake((input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init));
      },
    });
  };

  const callsTo = (path: string) =>
    cy.get<sinon.SinonStub>("@fetch").then((stub) =>
      stub.getCalls().filter((call) => String(call.args[0]).endsWith(path)),
    );

  const fill = (values: { firstName?: string; lastName?: string; email?: string; password?: string }) => {
    if (values.firstName) cy.get("[data-testid=register-first-name]").type(values.firstName);
    if (values.lastName) cy.get("[data-testid=register-last-name]").type(values.lastName);
    if (values.email) cy.get("[data-testid=register-email]").type(values.email);
    if (values.password) cy.get("[data-testid=register-password]").type(values.password);
  };

  const validValues = {
    firstName: "Andrei",
    lastName: "Pop",
    email: "andrei.pop@stud.ubbcluj.ro",
    password: "Secret1!",
  };

  const submit = () => cy.get("[data-testid=register-submit]").click();

  const errorFor = (testId: string) =>
    cy
      .get(`[data-testid=${testId}]`)
      .invoke("attr", "aria-describedby")
      .then((describedBy) => cy.get(`#${String(describedBy).split(" ").pop()}`));

  it("renders the create account form from the design", () => {
    visitRegister();

    cy.get("[data-testid=page-register]").should("be.visible");
    cy.get(".ui-auth-layout").should("exist");
    cy.contains("h2", "Create your account").should("be.visible");
    cy.contains("Join UBB Events to discover and register for events.").should("be.visible");
    cy.get("label").contains("First name").should("be.visible");
    cy.get("[data-testid=register-first-name]").should("have.attr", "placeholder", "Andrei");
    cy.get("label").contains("Last name").should("be.visible");
    cy.get("[data-testid=register-last-name]").should("have.attr", "placeholder", "Pop");
    cy.get("[data-testid=register-email]")
      .should("have.attr", "type", "email")
      .and("have.attr", "placeholder", "andrei.pop@stud.ubbcluj.ro");
    cy.get("[data-testid=register-password]")
      .should("have.attr", "type", "password")
      .and("have.attr", "placeholder", "••••••••");
    cy.contains("Min. 8 characters with upper & lower case, a number and a symbol").should("be.visible");
    cy.get("[data-testid=register-submit]").should("contain.text", "Create account").and("be.enabled");
    cy.contains("Already have an account?").should("be.visible");
    cy.contains("a", "Sign in").should("have.attr", "href", "/login");

    // First name and last name sit side by side.
    cy.get("[data-testid=register-first-name]").then(($first) => {
      cy.get("[data-testid=register-last-name]").then(($last) => {
        const first = $first[0].getBoundingClientRect();
        const last = $last[0].getBoundingClientRect();
        expect(last.top).to.be.closeTo(first.top, 1);
        expect(last.left).to.be.greaterThan(first.right);
      });
    });
  });

  it("validates required fields and email format without calling the API", () => {
    visitRegister();

    submit();
    errorFor("register-first-name").should("contain.text", "First name is required");
    errorFor("register-last-name").should("contain.text", "Last name is required");
    errorFor("register-email").should("contain.text", "Email is required");
    errorFor("register-password").should("contain.text", "Password is required");
    cy.get("[data-testid=register-first-name]").should("have.attr", "aria-invalid", "true");

    fill({ ...validValues, firstName: "   ", email: "andrei@" });
    submit();
    cy.contains("First name is required").should("be.visible");
    cy.contains("Last name is required").should("not.exist");
    cy.contains("Enter a valid email address").should("be.visible");

    callsTo("/api/auth/register").should("have.length", 0);
    cy.location("pathname").should("eq", "/register");
  });

  it("shows the missing password rules in the field error", () => {
    visitRegister();

    fill({ ...validValues, password: "secret" });
    submit();

    errorFor("register-password").should(
      "contain.text",
      "Password needs at least 8 characters, an uppercase letter, a number and a symbol.",
    );
    cy.get("[data-testid=register-password]").should("have.attr", "aria-invalid", "true");
    // In the Error state the error text replaces the helper text.
    cy.contains("Min. 8 characters with upper & lower case, a number and a symbol").should("not.exist");
    callsTo("/api/auth/register").should("have.length", 0);
  });

  it("sends the trimmed payload to POST /api/auth/register", () => {
    visitRegister();

    fill({
      firstName: "  Andrei ",
      lastName: " Pop ",
      email: " andrei.pop@stud.ubbcluj.ro ",
      password: " Secret1! ",
    });
    submit();

    callsTo("/api/auth/register").then((calls) => {
      expect(calls).to.have.length(1);
      expect(calls[0].args[1]?.method).to.equal("POST");
      expect(JSON.parse(String(calls[0].args[1]?.body))).to.deep.equal({
        firstName: "Andrei",
        lastName: "Pop",
        email: "andrei.pop@stud.ubbcluj.ro",
        password: " Secret1! ",
      });
    });
  });

  it("signs in after registering and goes to /events", () => {
    visitRegister();

    fill(validValues);
    submit();

    cy.location("pathname").should("eq", "/events");
    cy.window().its("localStorage.token").should("eq", "jwt");
    callsTo("/api/auth/login").then((calls) => {
      expect(calls).to.have.length(1);
      expect(JSON.parse(String(calls[0].args[1]?.body))).to.deep.equal({
        email: "andrei.pop@stud.ubbcluj.ro",
        password: "Secret1!",
      });
    });
  });

  it("falls back to /login when the automatic sign-in fails", () => {
    visitRegister((url, init) => {
      if (url.endsWith("/api/auth/login")) return Promise.reject(new TypeError("Failed to fetch"));
      return successfulBackend(url, init);
    });

    fill(validValues);
    submit();

    cy.location("pathname").should("eq", "/login");
    cy.get("[data-testid=toast-success]")
      .should("be.visible")
      .and("contain.text", "Account created")
      .and("contain.text", "Please sign in.");
  });

  it("shows an already registered email as the email Error state", () => {
    visitRegister(
      backendWithRegister(() => json(409, { status: 409, message: "Email already used", errors: [] })),
    );

    fill(validValues);
    submit();

    errorFor("register-email").should("contain.text", "This email address is already registered");
    cy.get("[data-testid=register-email]")
      .should("have.attr", "aria-invalid", "true")
      .and("have.value", "andrei.pop@stud.ubbcluj.ro");
    cy.get("[data-testid=register-first-name]").should("have.value", "Andrei");
    cy.get("[data-testid=toast-error]").should("not.exist");
    cy.get("[data-testid=register-submit]").should("be.enabled");
    cy.location("pathname").should("eq", "/register");
  });

  it("maps backend field errors to the matching fields", () => {
    visitRegister(
      backendWithRegister(() =>
        json(400, {
          status: 400,
          message: "Request validation failed",
          errors: [
            { field: "firstName", message: "firstName is required" },
            { field: "lastName", message: "lastName is required" },
            { field: "email", message: "email must be valid" },
            { field: "password", message: "password must contain a special character" },
          ],
        }),
      ),
    );

    fill(validValues);
    submit();

    errorFor("register-first-name").should("contain.text", "firstName is required");
    errorFor("register-last-name").should("contain.text", "lastName is required");
    errorFor("register-email").should("contain.text", "email must be valid");
    errorFor("register-password").should("contain.text", "password must contain a special character");
    cy.get("[data-testid=toast-error]").should("not.exist");
  });

  it("shows other server errors in a toast", () => {
    visitRegister(
      backendWithRegister(() => json(500, { status: 500, message: "Unexpected server error", errors: [] })),
    );

    fill(validValues);
    submit();

    cy.get("[data-testid=toast-error]")
      .should("be.visible")
      .and("contain.text", "Couldn't create account")
      .and("contain.text", "Unexpected server error");
    cy.location("pathname").should("eq", "/register");
  });

  it("shows a toast when the network fails", () => {
    visitRegister(backendWithRegister(() => Promise.reject(new TypeError("Failed to fetch"))));

    fill(validValues);
    submit();

    cy.get("[data-testid=toast-error]")
      .should("be.visible")
      .and("contain.text", "Couldn't create account")
      .and("contain.text", "Check your connection and try again.");
    cy.get("[data-testid=register-email]").should("have.value", "andrei.pop@stud.ubbcluj.ro");
    cy.get("[data-testid=register-submit]").should("be.enabled");
    cy.location("pathname").should("eq", "/register");
  });

  it("disables the button with a loading state while submitting", () => {
    visitRegister(backendWithRegister(() => new Promise<Response>(() => undefined)));

    fill(validValues);
    submit();

    cy.get("[data-testid=register-submit]")
      .should("be.disabled")
      .and("have.attr", "aria-busy", "true")
      .and("contain.text", "Loading…");
    cy.get("[data-testid=register-submit]").click({ force: true });
    cy.get("form").submit();
    callsTo("/api/auth/register").should("have.length", 1);
  });

  it("navigates to /login from the sign in link", () => {
    visitRegister();
    cy.contains("a", "Sign in").click();
    cy.location("pathname").should("eq", "/login");
    cy.get("[data-testid=page-login]").should("be.visible");
  });
});
