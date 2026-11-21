type Membership = { organizationId: number; role: "MEMBER" | "MANAGER" };
type RequestStatus = "PENDING" | "ACCEPTED" | "DECLINED";
type RequestRow = {
  requestId: number;
  firstName: string;
  lastName: string;
  email: string;
  requestedAt: string | null;
  status: RequestStatus;
};
type AppState = {
  rowsByStatus: Record<RequestStatus, RequestRow[]>;
  calls: Array<{ url: string; method?: string }>;
};

const profile = {
  id: 7,
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  memberships: [] as Membership[],
};

const initialRows: Record<RequestStatus, RequestRow[]> = {
  PENDING: [
    { requestId: 11, firstName: "Grace", lastName: "Hopper", email: "grace@example.com", requestedAt: "2026-11-19T14:30:00Z", status: "PENDING" },
    { requestId: 14, firstName: "Katherine", lastName: "Johnson", email: "katherine@example.com", requestedAt: "2026-11-18T10:00:00Z", status: "PENDING" },
  ],
  ACCEPTED: [{ requestId: 12, firstName: "Dorothy", lastName: "Vaughan", email: "dorothy@example.com", requestedAt: "2026-11-17T10:00:00Z", status: "ACCEPTED" }],
  DECLINED: [{ requestId: 13, firstName: "Mary", lastName: "Jackson", email: "mary@example.com", requestedAt: null, status: "DECLINED" }],
};

function response(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as Response;
}

function visitRequests(options: {
  memberships?: Membership[];
  detailsErrors?: Partial<Record<RequestStatus, number>>;
  empty?: boolean;
  patchStatus?: number;
  patchDelayMs?: number;
} = {}): AppState {
  const state: AppState = {
    rowsByStatus: structuredClone(initialRows),
    calls: [],
  };
  if (options.empty) state.rowsByStatus = { PENDING: [], ACCEPTED: [], DECLINED: [] };
  const memberships = options.memberships ?? [{ organizationId: 3, role: "MANAGER" as const }];

  cy.visit("/org/3/requests", {
    onBeforeLoad(win) {
      win.localStorage.setItem("token", "jwt");
      win.fetch = cy.stub().callsFake((input, init) => {
        const url = new URL(String(input));
        state.calls.push({ url: `${url.pathname}${url.search}`, method: init?.method });
        if (url.pathname.endsWith("/api/users/me")) return Promise.resolve(response({ ...profile, memberships }));
        if (url.pathname === "/api/organizations/3") return Promise.resolve(response({ organizationId: 3, name: "Societatea Hermes", description: "A student organization", status: "MEMBER", role: "MANAGER" }));
        if (url.pathname.endsWith("/membership-requests/details")) {
          const status = (url.searchParams.get("status") ?? "PENDING") as RequestStatus;
          return Promise.resolve(response(state.rowsByStatus[status], options.detailsErrors?.[status] ?? 200));
        }
        if (url.pathname.match(/\/membership-requests\/\d+$/) && init?.method === "PATCH") {
          const requestId = Number(url.pathname.split("/").at(-1));
          const decision = JSON.parse(String(init.body)).decision as "ACCEPTED" | "DECLINED";
          const resultStatus = options.patchStatus ?? 200;
          if (resultStatus >= 200 && resultStatus < 300) {
            const pending = state.rowsByStatus.PENDING.find((row) => row.requestId === requestId);
            if (pending) {
              state.rowsByStatus.PENDING = state.rowsByStatus.PENDING.filter((row) => row.requestId !== requestId);
              const nextStatus: RequestStatus = decision;
              state.rowsByStatus[nextStatus] = [...state.rowsByStatus[nextStatus], { ...pending, status: nextStatus }];
            }
          }
          const result = response({ status: decision === "ACCEPTED" ? "ACTIVE" : "DECLINED" }, resultStatus);
          return options.patchDelayMs
            ? new Promise((resolve) => win.setTimeout(() => resolve(result), options.patchDelayMs))
            : Promise.resolve(result);
        }
        if (url.pathname.endsWith("/membership-requests")) return Promise.resolve(response(state.rowsByStatus.PENDING.map((row) => ({ id: row.requestId }))));
        if (url.pathname.endsWith("/members")) return Promise.resolve(response([]));
        return Promise.resolve(response([]));
      }) as typeof fetch;
    },
  });
  return state;
}

describe("membership requests screen", () => {
  it("loads all status URLs and renders the applicant data and tab counts", () => {
    cy.viewport(1440, 900);
    visitRequests();
    cy.get("[data-testid=page-membership-requests]").should("be.visible");
    cy.get("[role=tab]").should("have.length", 3);
    cy.contains("[role=tab]", "Pending · 2").should("have.attr", "aria-selected", "true");
    cy.contains("[role=tab]", "Accepted · 1").should("exist");
    cy.contains("[role=tab]", "Declined · 1").should("exist");
    cy.get("[data-testid=membership-request-row]").should("have.length", 2).and("contain", "Grace Hopper").and("contain", "grace@example.com");
    cy.get("[data-testid=membership-request-date]").first().should("contain", "19");
    cy.get("[data-testid=membership-request-accept]").first().should("be.visible");
    cy.get("[data-testid=membership-request-decline]").first().should("be.visible");
    cy.window().then((win) => {
      const calls = (win.fetch as unknown as Cypress.SinonStub).getCalls().map((call) => String(call.args[0]));
      expect(calls.some((url) => url.includes("membership-requests/details?status=PENDING"))).to.equal(true);
      expect(calls.some((url) => url.includes("membership-requests/details?status=ACCEPTED"))).to.equal(true);
      expect(calls.some((url) => url.includes("membership-requests/details?status=DECLINED"))).to.equal(true);
    });
  });

  it("switches tabs with the keyboard and shows accepted and declined rows", () => {
    visitRequests();
    cy.get("#membership-requests-tab-PENDING").focus().type("{rightarrow}");
    cy.get("#membership-requests-tab-ACCEPTED").should("have.attr", "aria-selected", "true").and("be.focused");
    cy.get("[data-testid=membership-request-row]").should("contain", "Dorothy Vaughan");
    cy.get("#membership-requests-tab-DECLINED").click();
    cy.get("[data-testid=membership-request-row]").should("contain", "Mary Jackson");
    cy.get("[data-testid=membership-request-date]").should("contain", "—");
    cy.get("[data-testid=membership-request-accept]").should("not.exist");
  });

  it("updates status counts and the sidebar badge after acceptance and decline", () => {
    visitRequests({ patchDelayMs: 300 });
    cy.get("[data-testid=membership-request-accept]").first().click();
    cy.get("[data-testid=membership-request-accept]").should("have.attr", "aria-busy", "true");
    cy.get("[data-testid=toast-success]").should("be.visible");
    cy.contains("[role=tab]", "Pending · 1").should("exist");
    cy.contains("[role=tab]", "Accepted · 2").should("exist");
    cy.get("[data-testid=workspace-membership-requests] .workspace-count").should("contain", "1");
    cy.get("[data-testid=membership-request-decline]").first().click();
    cy.get("[data-testid=membership-request-decline]").should("have.attr", "aria-busy", "true");
    cy.get("[data-testid=toast-success]").should("be.visible");
    cy.contains("[role=tab]", "Pending · 0").should("exist");
    cy.contains("[role=tab]", "Declined · 2").should("exist");
    cy.get("[data-testid=workspace-membership-requests] .workspace-count").should("contain", "0");
    cy.window().then((win) => {
      const calls = (win.fetch as unknown as Cypress.SinonStub).getCalls();
      const payloads = calls.filter((call) => (call.args[1] as RequestInit | undefined)?.method === "PATCH");
      const urls = calls.map((call) => String(call.args[0]));
      expect(JSON.parse(String((payloads[0].args[1] as RequestInit).body))).to.deep.equal({ decision: "ACCEPTED" });
      expect(JSON.parse(String((payloads[1].args[1] as RequestInit).body))).to.deep.equal({ decision: "DECLINED" });
      expect(urls.filter((url) => url.includes("membership-requests/details?status=PENDING")).length).to.be.greaterThan(1);
      expect(urls.filter((url) => url.includes("membership-requests/details?status=ACCEPTED")).length).to.be.greaterThan(1);
      expect(urls.filter((url) => url.includes("membership-requests/details?status=DECLINED")).length).to.be.greaterThan(1);
      expect(urls.filter((url) => /\/api\/organizations\/3\/membership-requests$/.test(new URL(url).pathname)).length).to.be.greaterThan(1);
    });
  });

  it("preserves rows and shows an error toast when a decision fails", () => {
    visitRequests({ patchStatus: 500 });
    cy.get("[data-testid=membership-request-decline]").first().click();
    cy.get("[data-testid=toast-error]").should("be.visible");
    cy.get("[data-testid=membership-request-row]").should("have.length", 2).and("contain", "Grace Hopper");
    cy.contains("[role=tab]", "Pending · 2").should("exist");
  });

  it("shows the empty message on every status tab", () => {
    visitRequests({ empty: true });
    cy.get("[data-testid=membership-requests-empty]").should("contain", "No pending requests");
    cy.get("#membership-requests-tab-ACCEPTED").click();
    cy.get("[data-testid=membership-requests-empty]").should("contain", "No accepted requests");
    cy.get("#membership-requests-tab-DECLINED").click();
    cy.get("[data-testid=membership-requests-empty]").should("contain", "No declined requests");
  });

  it("shows the error for a failed tab and does not display a false zero count", () => {
    visitRequests({ detailsErrors: { ACCEPTED: 500 } });
    cy.contains("[role=tab]", "Accepted · —").should("exist");
    cy.get("#membership-requests-tab-ACCEPTED").click();
    cy.get("[data-testid=membership-requests-error]").should("be.visible");
    cy.get("[data-testid=membership-requests-retry]").should("be.visible");
  });

  it("does not expose the screen or load request details for a plain member", () => {
    visitRequests({ memberships: [{ organizationId: 3, role: "MEMBER" }] });
    cy.get("[data-testid=page-membership-requests]").should("not.exist");
    cy.get("[data-testid=page-forbidden]").should("exist");
    cy.window().then((win) => {
      const calls = (win.fetch as unknown as Cypress.SinonStub).getCalls().map((call) => String(call.args[0]));
      expect(calls.some((url) => url.includes("membership-requests/details"))).to.equal(false);
    });
  });
});
