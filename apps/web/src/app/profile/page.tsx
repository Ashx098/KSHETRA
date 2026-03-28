import type { ReactElement } from "react";

import { AppShell, PlaceholderPanel } from "../../components/app-shell";
import { ProfileClient } from "../../components/profile/profile-client";

export default function ProfilePage(): ReactElement {
  return (
    <AppShell
      section="profile"
      title="Profile"
      description="Complete onboarding, edit persisted profile fields, manage goals, and inspect the seeded attribute state."
    >
      <ProfileClient />
      <PlaceholderPanel
        label="Later Phases"
        detail="Notifications, advanced system settings, and AI modes remain out of scope for Phase 1."
      />
    </AppShell>
  );
}
