import type { ReactElement } from "react";

import { AppShell } from "../components/app-shell";
import { HomeClient } from "../components/home/home-client";

export default function IndexPage(): ReactElement {
  return (
    <AppShell
      section="home"
      title="Home"
      description="Operational daily surface for the deterministic Phase 2 quest loop. Quest assignment, completion rewards, XP, and attribute movement all remain backend-authoritative."
    >
      <HomeClient />
    </AppShell>
  );
}
