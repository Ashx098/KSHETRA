import type { ReactElement } from "react";

import { AppShell } from "../../components/app-shell";
import { ProgressClient } from "../../components/progress/progress-client";

export default function ProgressPage(): ReactElement {
  return (
    <AppShell
      section="progress"
      title="Progress"
      description="Read deterministic rank, streak, XP history, attribute history, and valid-day state from the backend without duplicating progression logic in the frontend."
    >
      <ProgressClient />
    </AppShell>
  );
}
