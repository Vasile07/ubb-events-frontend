import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../../shared/api/client";
import { updateCurrentUser } from "../../shared/api/auth";
import { Badge, Button, TextField, Avatar, useToast } from "../../shared/ui";
import { useAuth } from "../auth/AuthProvider";

export function ProfilePage() {
  const { user, refreshUser, logout } = useAuth();
  const toast = useToast();
  const saved = useMemo(() => ({ firstName: user?.firstName ?? "", lastName: user?.lastName ?? "" }), [user]);
  const [firstName, setFirstName] = useState(saved.firstName);
  const [lastName, setLastName] = useState(saved.lastName);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { setFirstName(saved.firstName); setLastName(saved.lastName); }, [saved.firstName, saved.lastName]);

  if (!user) return <main data-testid="page-profile" role="status">Loading your profile…</main>;
  const trimmedFirst = firstName.trim();
  const trimmedLast = lastName.trim();
  const dirty = firstName !== saved.firstName || lastName !== saved.lastName;
  const valid = Boolean(trimmedFirst && trimmedLast);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!dirty || !valid || saving) return;
    setSaving(true); setErrors({});
    try {
      await updateCurrentUser({ firstName: trimmedFirst, lastName: trimmedLast });
      await refreshUser();
      toast.success("Profile updated", "Your profile changes were saved.");
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.fieldErrors);
      else toast.error("Profile update failed", "Please try again.");
    } finally { setSaving(false); }
  }

  return (
    <main data-testid="page-profile" className="profile-page">
      <div className="profile-page-header"><h1>My profile</h1><p>Manage your account details and memberships.</p></div>
      <div className="profile-grid">
        <section className="ui-card" aria-labelledby="account-title">
          <h2 id="account-title">Account</h2>
          <Avatar testId="profile-avatar" firstName={user.firstName} lastName={user.lastName} size={80} />
          <form onSubmit={submit}>
            <div className="profile-name-fields">
              <TextField data-testid="profile-first-name" label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} error={errors.firstName || (!trimmedFirst ? "First name is required" : undefined)} />
              <TextField data-testid="profile-last-name" label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} error={errors.lastName || (!trimmedLast ? "Last name is required" : undefined)} />
            </div>
            <TextField data-testid="profile-email" label="Email" value={user.email} disabled helperText="Your email is your sign-in identifier and can't be changed" />
            <div className="profile-actions"><Button data-testid="profile-save" type="submit" disabled={!dirty || !valid || saving} loading={saving}>Save changes</Button><Button type="button" variant="Secondary" disabled={!dirty || saving} onClick={() => { setFirstName(saved.firstName); setLastName(saved.lastName); setErrors({}); }}>Cancel</Button></div>
          </form>
        </section>
        <aside className="ui-card" aria-labelledby="organizations-title"><h2 id="organizations-title">My organizations</h2>{user.memberships.length ? <ul>{user.memberships.map((membership) => <li key={membership.organizationId}>{membership.organizationName ?? `Organization ${membership.organizationId}`} <Badge tone="Neutral">{membership.role}</Badge></li>)}</ul> : <p>You don't belong to any organizations yet.</p>}<Button type="button" variant="Secondary" onClick={() => logout()}>Log out</Button></aside>
      </div>
    </main>
  );
}
