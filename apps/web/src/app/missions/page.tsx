import type { ReactElement } from "react";

import { AppShell, PlaceholderPanel } from "../../components/app-shell";

export default function MissionsPage(): ReactElement {
  return (
    <AppShell
      section="missions"
      title="Missions"
      description="Dedicated action screen scaffold for quests, dungeons, and raids. Only placeholder structure exists in Phase 0."
    >
      <PlaceholderPanel
        label="Quest Segment"
        detail="Quest lists and completion flows begin in later phases."
      />
      <PlaceholderPanel
        label="Dungeon Segment"
        detail="Reserved for future phases. No dungeon logic or persistence exists yet."
      />
      <PlaceholderPanel
        label="Raid Segment"
        detail="Reserved for future phases. No raid logic or progression gating is implemented in Phase 0."
      />
      <PlaceholderPanel
        label="Detail Panel"
        detail="Desktop detail treatment is intentionally deferred until real mission data exists."
      />
    </AppShell>
  );
}
