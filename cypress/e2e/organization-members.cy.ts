type Membership = { organizationId: number; role: "MEMBER" | "MANAGER" };
type Member = { id: number; fullName: string; firstName: string; lastName: string; email: string; role: "MEMBER" | "MANAGER" };

const profile = {
  id: 7,
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  memberships: [] as Membership[],
};

const initialMembers: Member[] = [
  { id: 7, fullName: "Ada Lovelace", firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", role: "MEMBER" },
  { id: 8, fullName: "Grace Hopper", firstName: "Grace", lastName: "Hopper", email: "grace@example.com", role: "MANAGER" },
];

function response(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as Response;
}

function visitMembers(options: {
  memberships?: Membership[];
  members?: Member[];
  membersErrors?: number[];
  patchStatus?: number;
  delayMs?: number;
} = {}) {
  const state = {
    members: structuredClone(options.members ?? initialMembers),
    calls: [] as Array<{ url: URL; method?: string; body?: string }>,
    getCount: 0,
    profileCount: 0,
  };
  const memberships = options.memberships ?? [{ organizationId: 3, role: "MANAGER" as const }];

  cy.visit("/org/3/members", {
    onBeforeLoad(win) {
      win.localStorage.setItem("token", "jwt");
      win.fetch = cy.stub().callsFake((input, init) => {
        const url = new URL(String(input));
        const method = init?.method;
        const body = typeof init?.body === "string" ? init.body : undefined;
        state.calls.push({ url, method, body });
        if (url.pathname.endsWith("/api/users/me")) {
          state.profileCount += 1;
          return Promise.resolve(response({ ...profile, memberships }));
        }
        if (url.pathname === "/api/organizations/3") return Promise.resolve(response({ organizationId: 3, name: "Societatea Hermes", description: "A student organization", status: "MEMBER", role: "MANAGER" }));
        if (url.pathname.endsWith("/membership-requests")) return Promise.resolve(response([]));
        if (url.pathname === "/api/organizations/3/members" && method !== "PATCH") {
          state.getCount += 1;
          const status = options.membersErrors?.[state.getCount - 1] ?? 200;
          const result = response(state.members, status);
          if (options.delayMs && state.getCount === 1) return new Promise((resolve) => win.setTimeout(() => resolve(result), options.delayMs));
          return Promise.resolve(result);
        }
        const promotion = url.pathname.match(/^\/api\/organizations\/3\/members\/(\d+)\/role$/);
        if (promotion && method === "PATCH") {
          const status = options.patchStatus ?? 200;
          if (status >= 200 && status < 300) {
            const member = state.members.find((row) => row.id === Number(promotion[1]));
            if (member) member.role = "MANAGER";
          }
          const result = response({ userId: Number(promotion[1]), role: "MANAGER" }, status);
          if (options.delayMs) return new Promise((resolve) => win.setTimeout(() => resolve(result), options.delayMs));
          return Promise.resolve(result);
        }
        return Promise.resolve(response([]));
      }) as typeof fetch;
    },
  });
  return state;
}

describe("organization members screen", () => {
  it("renders member count, roles, avatar and contact details for a manager", () => {
    cy.viewport(1440, 900);
    visitMembers();
    cy.get("[data-testid=organization-members-page]").should("be.visible");
    cy.get("h1").should("contain", "Members");
    cy.get("[data-testid=organization-members-count]").should("contain", "2");
    cy.get("[data-testid=organization-members-banner]").should("be.visible").and("contain", "can’t be undone");
    cy.get("table th[scope=col]").should("have.length", 3);
    cy.get("[data-testid=organization-member-row]").should("have.length", 2);
    cy.get("[data-testid=organization-member-row]").first().within(() => {
      cy.get("[role=img]").should("have.attr", "aria-label", "Ada Lovelace");
      cy.contains("Ada Lovelace").should("be.visible");
      cy.contains("ada@example.com").should("be.visible");
      cy.get(".ui-badge-neutral").should("contain", "Member");
      cy.get("[data-testid=organization-member-promote]").should("be.visible");
    });
    cy.get("[data-testid=organization-member-row]").eq(1).within(() => {
      cy.get(".ui-badge-brand").should("contain", "Manager");
      cy.get("[data-testid=organization-member-promote]").should("not.exist");
    });
  });

  it("shows members to a plain member without promotion controls or a PATCH call", () => {
    const state = visitMembers({ memberships: [{ organizationId: 3, role: "MEMBER" }] });
    cy.get("[data-testid=organization-members-page]").should("be.visible");
    cy.get("[data-testid=organization-member-row]").should("have.length", 2);
    cy.get("[data-testid=organization-member-promote]").should("not.exist");
    cy.then(() => expect(state.calls.some((call) => call.method === "PATCH")).to.equal(false));
  });

  it("confirms the permanent promotion, sends the exact request, refreshes members and auth", () => {
    const state = visitMembers({ delayMs: 100 });
    cy.get("[data-testid=organization-member-promote]").first().click();
    cy.get("[role=dialog]").should("be.visible").and("contain", "cannot be undone").and("contain", "There is no demote action");
    cy.get("[data-testid=organization-member-confirm-promote]").click();
    cy.get("[data-testid=organization-member-confirm-promote]").should("be.disabled");
    cy.get("[role=dialog]").should("not.exist");
    cy.get("[data-testid=organization-member-row]").first().find(".ui-badge-brand").should("contain", "Manager");
    cy.then(() => {
      const patch = state.calls.find((call) => call.method === "PATCH");
      expect(patch?.url.pathname).to.equal("/api/organizations/3/members/7/role");
      expect(JSON.parse(patch?.body ?? "{}")).to.deep.equal({ role: "MANAGER" });
      expect(state.calls.filter((call) => call.url.pathname === "/api/organizations/3/members").length).to.be.greaterThan(1);
      expect(state.profileCount).to.be.greaterThan(1);
    });
  });

  it("allows cancel and preserves the row with a visible API error after failed promotion", () => {
    const state = visitMembers({ patchStatus: 500 });
    cy.get("[data-testid=organization-member-promote]").first().click();
    cy.get("[role=dialog]").contains("Cancel").click();
    cy.get("[data-testid=organization-member-row]").first().find(".ui-badge-neutral").should("contain", "Member");
    cy.get("[data-testid=organization-member-promote]").first().click();
    cy.get("[data-testid=organization-member-confirm-promote]").click();
    cy.get("[data-testid=toast-error]").should("be.visible");
    cy.get("[data-testid=organization-member-row]").first().find(".ui-badge-neutral").should("contain", "Member");
    cy.then(() => expect(state.calls.filter((call) => call.method === "PATCH")).to.have.length(1));
  });

  it("shows loading, empty, retryable error, and invalid route states", () => {
    visitMembers({ members: [], delayMs: 150 });
    cy.get("[data-testid=organization-members-loading]").should("be.visible");
    cy.get("[data-testid=organization-members-empty]").should("be.visible");

    visitMembers({ membersErrors: [500, 500, 200] });
    cy.get("[data-testid=organization-members-error]").should("be.visible");
    cy.get("[data-testid=organization-members-retry]").click();
    cy.get("[data-testid=organization-members-page]").should("be.visible");

    cy.visit("/org/not-an-id/members", {
      onBeforeLoad(win) {
        win.localStorage.setItem("token", "jwt");
        win.fetch = cy.stub().callsFake((input) => {
          const url = new URL(String(input));
          if (url.pathname.endsWith("/api/users/me")) return Promise.resolve(response({ ...profile, memberships: [] }));
          return Promise.resolve(response([]));
        }) as typeof fetch;
      },
    });
    cy.get("[data-testid=organization-members-invalid]").should("be.visible");
  });
});
