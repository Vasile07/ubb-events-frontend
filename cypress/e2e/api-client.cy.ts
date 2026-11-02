describe("shared API client", () => {
  const importFromApp = <T>(path: string) =>
    cy.window().then((win) => win.eval(`import("${path}")`) as Promise<T>);

  beforeEach(() => {
    cy.visit("/");
    cy.window().then((win) => win.localStorage.clear());
  });

  it("stores and clears the bearer token", () => {
    importFromApp<typeof import("../../src/shared/lib/tokenStorage")>(
      "/src/shared/lib/tokenStorage.ts",
    ).then(({ getToken, setToken, clearToken }) => {
      expect(getToken()).to.equal(null);
      setToken("test-token");
      expect(getToken()).to.equal("test-token");
      clearToken();
      expect(getToken()).to.equal(null);
    });
  });

  it("calls GET /api/organizations through the configured base URL with a Bearer token", () => {
    cy.window().then((win) => {
      const fetchStub = cy.stub(win, "fetch").resolves({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve([
            {
              organizationId: 7,
              name: "Robotics",
              description: null,
              status: "NONE",
              role: "NONE",
            },
          ]),
      } as Response);
      return win
        .eval('import("/src/shared/api/organizations.ts")')
        .then(async ({ getOrganizations }) => {
          const { setToken } = await win.eval(
            'import("/src/shared/lib/tokenStorage.ts")',
          );
          setToken("test-token");
          const organizations = await getOrganizations();
          expect(organizations).to.deep.equal([
            {
              organizationId: 7,
              name: "Robotics",
              description: null,
              status: "NONE",
              role: "NONE",
            },
          ]);
          expect(fetchStub).to.have.been.calledOnce;
          expect(fetchStub.firstCall.args[0]).to.equal(
            "http://backend.test/api/organizations",
          );
          expect(
            new Headers(fetchStub.firstCall.args[1]?.headers).get(
              "Authorization",
            ),
          ).to.equal("Bearer test-token");
        });
    });
  });

  it("omits Authorization when no token is stored", () => {
    cy.window().then((win) => {
      const fetchStub = cy.stub(win, "fetch").resolves({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      } as Response);
      return win
        .eval('import("/src/shared/api/client.ts")')
        .then(async ({ apiFetch }) => {
          await apiFetch("/api/organizations");
          expect(
            new Headers(fetchStub.firstCall.args[1]?.headers).get(
              "Authorization",
            ),
          ).to.equal(null);
        });
    });
  });

  it("serializes JSON request bodies and sends JSON content type", () => {
    cy.window().then((win) => {
      const fetchStub = cy.stub(win, "fetch").resolves({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true }),
      } as Response);
      return importFromApp<typeof import("../../src/shared/api/client")>(
        "/src/shared/api/client.ts",
      ).then(async ({ apiFetch }) => {
        await apiFetch("/api/example", {
          method: "POST",
          body: { title: "Demo" },
        } as RequestInit);
        expect(fetchStub.firstCall.args[1]?.body).to.equal('{"title":"Demo"}');
        expect(
          new Headers(fetchStub.firstCall.args[1]?.headers).get("Content-Type"),
        ).to.equal("application/json");
      });
    });
  });

  it("converts backend validation errors to ApiError and preserves nested indexed paths", () => {
    cy.window().then((win) => {
      cy.stub(win, "fetch").resolves({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            status: 400,
            message: "Request validation failed",
            errors: [
              { field: "email", message: "must be valid" },
              { field: "tasks[1].description", message: "must not be blank" },
            ],
          }),
      } as Response);
      return importFromApp<typeof import("../../src/shared/api/client")>(
        "/src/shared/api/client.ts",
      ).then(async ({ apiFetch, ApiError }) => {
        try {
          await apiFetch("/api/example");
          throw new Error("Expected request to reject");
        } catch (error) {
          expect(error).to.be.instanceOf(ApiError);
          expect(error).to.include({
            status: 400,
            message: "Request validation failed",
          });
          expect(
            (error as InstanceType<typeof ApiError>).fieldErrors,
          ).to.deep.equal({
            email: "must be valid",
            "tasks[1].description": "must not be blank",
          });
        }
      });
    });
  });

  it("calls the unauthorized handler for protected 401s but not login or register", () => {
    cy.window().then((win) => {
      cy.stub(win, "fetch").resolves({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({ status: 401, message: "Unauthorized", errors: [] }),
      } as Response);
      return importFromApp<typeof import("../../src/shared/api/client")>(
        "/src/shared/api/client.ts",
      ).then(async ({ apiFetch, setUnauthorizedHandler }) => {
        const handler = cy.stub();
        try {
          await apiFetch("/api/organizations");
        } catch {
          // The default no-op handler must leave the request's ApiError intact.
        }
        setUnauthorizedHandler(handler);
        for (const path of [
          "/api/organizations",
          "/api/auth/login",
          "/api/auth/register",
        ]) {
          try {
            await apiFetch(path);
          } catch {
            // The request is expected to reject; only callback behavior matters here.
          }
        }
        expect(handler).to.have.been.calledOnce;
      });
    });
  });

  it("configures query retries for client and network errors with a sensible stale time", () => {
    cy.window().then((win) =>
      Promise.all([
        win.eval('import("/src/shared/lib/queryClient.ts")'),
        win.eval('import("/src/shared/api/client.ts")'),
      ]).then(([{ createQueryClient }, { ApiError }]) => {
        const options = createQueryClient().getDefaultOptions().queries;
        expect(options?.staleTime).to.equal(60_000);
        expect(options?.retry).to.be.a("function");
        expect(
          (options?.retry as (failureCount: number, error: Error) => boolean)(
            0,
            new ApiError(400, "bad"),
          ),
        ).to.equal(false);
        expect(
          (options?.retry as (failureCount: number, error: Error) => boolean)(
            0,
            new Error("network"),
          ),
        ).to.equal(true);
        expect(
          (options?.retry as (failureCount: number, error: Error) => boolean)(
            1,
            new Error("network"),
          ),
        ).to.equal(false);
      }),
    );
  });
});
