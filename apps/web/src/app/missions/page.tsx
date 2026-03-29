import type { ReactElement } from "react";

import { AppShell } from "../../components/app-shell";
import { MissionsClient } from "../../components/missions/missions-client";

export default function MissionsPage(): ReactElement {
  return (
    <AppShell
      section="missions"
      title="Missions"
      description="Operational surface for structured dungeons. Dungeons are heavier, multi-session challenges that sit beside the daily quest loop instead of replacing it."
    >
      <MissionsClient />
    </AppShell>
  );
}
