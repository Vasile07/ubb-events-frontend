import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { ApiError } from "../../shared/api/client";
import { getOrganization, getOrganizationMembers, promoteOrganizationMember } from "../../shared/api/organizations";
import type { OrganizationMemberResponse } from "../../shared/api/types";
import { Avatar, Badge, Button, EmptyState, ErrorState, Icon, Modal, PageHeader, TableSkeleton, useToast } from "../../shared/ui";
import { useAuth } from "../auth/AuthProvider";
import { organizationMembersKey } from "./membershipRequestQueries";

function parseId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function memberName(member: OrganizationMemberResponse): string {
  const fullName = member.fullName?.trim();
  if (fullName) return fullName;
  const names = `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim();
  return names || "Unknown user";
}

function memberNames(member: OrganizationMemberResponse): { firstName: string; lastName: string } {
  const fullName = memberName(member);
  const [firstName = "", ...lastNames] = fullName.split(/\s+/);
  return { firstName, lastName: lastNames.join(" ") };
}

export function OrganizationMembersPage() {
  const organizationId = parseId(useParams().organizationId);
  const { isManagerOf, refreshUser, user } = useAuth();
  const manager = organizationId !== null && isManagerOf(organizationId);
  const queryClient = useQueryClient();
  const toast = useToast();
  const [selectedMember, setSelectedMember] = useState<OrganizationMemberResponse | null>(null);

  const membersQuery = useQuery({
    queryKey: organizationId === null ? ["organization-members", "invalid"] : organizationMembersKey(organizationId),
    queryFn: () => getOrganizationMembers(organizationId as number),
    enabled: organizationId !== null,
  });
  const organizationQuery = useQuery({
    queryKey: ["organization", organizationId],
    queryFn: () => getOrganization(organizationId as number),
    enabled: organizationId !== null,
  });

  const promotion = useMutation({
    mutationFn: (member: OrganizationMemberResponse) => promoteOrganizationMember(organizationId as number, member.id),
    onSuccess: async (_result, member) => {
      await queryClient.invalidateQueries({ queryKey: organizationMembersKey(organizationId as number) });
      if (member.id === user?.id) await refreshUser();
      setSelectedMember(null);
      toast.success("Member promoted", `${memberName(member)} is now a manager.`);
    },
    onError: (error) => toast.error("Could not promote member", error instanceof ApiError ? error.message : "Please try again."),
  });

  if (organizationId === null) return <main className="organization-members-invalid" data-testid="organization-members-invalid" role="alert">Invalid organization.</main>;

  if (membersQuery.isLoading) return (
    <div className="organization-members-page" data-testid="organization-members-loading" aria-busy="true">
      <PageHeader title="Members" />
      <TableSkeleton rows={4} />
    </div>
  );

  if (membersQuery.isError) return (
    <div className="organization-members-page" data-testid="organization-members-error-state">
      <PageHeader title="Members" />
      <ErrorState title="We couldn’t load organization members" description="Check your connection and try again." testId="organization-members-error" retryTestId="organization-members-retry" onRetry={() => void membersQuery.refetch()} />
    </div>
  );

  const members = membersQuery.data ?? [];

  return (
    <div className="organization-members-page" data-testid="organization-members-page">
      <PageHeader title="Members" subtitle={`Members and managers of ${organizationQuery.data?.name ?? "this organization"}.`} rightSlot={<Badge tone="Neutral" data-testid="organization-members-count">{members.length} {members.length === 1 ? "member" : "members"}</Badge>} />
      <div className="organization-members-promotion-banner" data-testid="organization-members-banner" role="status">
        <Icon name="shield" />
        <span>Managers can edit events and review requests. Promoting a member to manager can’t be undone.</span>
      </div>
      {members.length === 0 ? (
        <EmptyState icon="Users" title="No members yet" description="Members will appear here once they join." testId="organization-members-empty" />
      ) : (
        <div className="ui-table-wrap organization-members-table-wrap">
          <table className="organization-members-table">
            <thead><tr><th scope="col">Member</th><th scope="col">Role</th>{manager && <th scope="col" aria-label="Actions" />}</tr></thead>
            <tbody>
              {members.map((member) => {
                const { firstName, lastName } = memberNames(member);
                const role = member.role === "MANAGER" ? "MANAGER" : "MEMBER";
                return (
                  <tr data-testid="organization-member-row" key={member.id}>
                    <td><div className="organization-member-person"><Avatar firstName={firstName} lastName={lastName} size={36} /><span><strong>{memberName(member)}</strong><small>{member.email || "—"}</small></span></div></td>
                    <td><Badge tone={role === "MANAGER" ? "Brand" : "Neutral"}>{role === "MANAGER" ? "Manager" : "Member"}</Badge></td>
                    {manager && <td className="organization-member-action">{role === "MEMBER" ? <Button size="Sm" variant="Secondary" data-testid="organization-member-promote" aria-label={`Promote ${memberName(member)} to manager`} onClick={() => setSelectedMember(member)}>Promote to manager</Button> : <span className="organization-member-manager-label">Manager</span>}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedMember && (
        <Modal open title="Promote to manager?" onClose={() => setSelectedMember(null)}>
          <p className="organization-members-confirm-copy">Promote {memberName(selectedMember)} to manager? This promotion is permanent and cannot be undone. There is no demote action.</p>
          {promotion.isError && <p className="organization-members-action-error" role="alert">{promotion.error instanceof ApiError ? promotion.error.message : "Please try again."}</p>}
          <div className="organization-members-modal-actions">
            <Button type="button" variant="Secondary" onClick={() => setSelectedMember(null)}>Cancel</Button>
            <Button type="button" loading={promotion.isPending} disabled={promotion.isPending} data-testid="organization-member-confirm-promote" onClick={() => promotion.mutate(selectedMember)}>Promote to manager</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
