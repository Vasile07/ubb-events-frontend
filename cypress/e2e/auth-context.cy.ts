describe("authentication context", () => {
  const importFromApp = <T>(path: string) =>
    cy.window().then((win) => win.eval(`import("${path}")`) as Promise<T>);

  beforeEach(() => {
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
  });

  it("normalizes the profile with a derived full name and membership helpers", () => {
    importFromApp<typeof import("../../src/features/auth/types")>(
      "/src/features/auth/types.ts",
    ).then(({ normalizeUser }) => {
      const user = normalizeUser({
        id: 7,
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        memberships: [
          { organizationId: 3, role: "MEMBER" },
          { organizationId: 4, role: "MANAGER" },
        ],
      });
      expect(user.fullName).to.equal("Ada Lovelace");
      expect(user.memberships).to.have.length(2);
    });
  });

  it("sends login credentials and register payload through the API client", () => {
    cy.window().then((win) => {
      const fetchStub = cy.stub(win, "fetch").callsFake((input, init) => {
        const url = String(input);
        const body = JSON.parse(String(init?.body));
        if (url.endsWith("/api/auth/login")) {
          expect(body).to.deep.equal({
            email: "ada@example.com",
            password: "secret",
          });
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ token: "jwt" }),
          } as Response);
        }
        expect(url).to.match(/\/api\/auth\/register$/);
        expect(body).to.deep.equal({
          firstName: "Ada",
          lastName: "Lovelace",
          email: "ada@example.com",
          password: "secret",
        });
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () =>
            Promise.resolve({
              id: 7,
              firstName: "Ada",
              lastName: "Lovelace",
              email: "ada@example.com",
            }),
        } as Response);
      });
      return win
        .eval('import("/src/shared/api/auth.ts")')
        .then(async ({ login, register }) => {
          await login("ada@example.com", "secret");
          await register({
            firstName: "Ada",
            lastName: "Lovelace",
            email: "ada@example.com",
            password: "secret",
          });
          expect(fetchStub).to.have.been.calledTwice;
        });
    });
  });

  it("restores the current user when a token exists", () => {
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.setItem("token", "jwt");
        cy.stub(win, "fetch").callsFake((input) => {
          if (String(input).endsWith("/api/users/me")) {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve({
              id: 7,
              firstName: "Ada",
              lastName: "Lovelace",
              email: "ada@example.com",
              memberships: [],
              }),
            } as Response);
          }
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve([]),
          } as Response);
        });
      },
    });
    cy.get("[data-testid=profile-link]").should("contain", "Ada Lovelace");
  });
});
