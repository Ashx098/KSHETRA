import type { ReactNode } from "react";

type RewardAttributeChange = {
  code: string;
  delta: number;
};

export function CompactAlertStrip({
  eyebrow,
  title,
  body,
  meta,
  tone = "neutral",
  action,
}: {
  eyebrow: string;
  title: string;
  body: string;
  meta?: ReactNode;
  tone?: "neutral" | "event" | "warning";
  action?: ReactNode;
}) {
  const toneClass =
    tone === "event"
      ? "border-sky-400/25 bg-sky-400/8"
      : tone === "warning"
        ? "border-amber-400/25 bg-amber-400/8"
        : "border-line bg-panel/70";

  return (
    <article className={`rounded-3xl border p-4 shadow-panel sm:col-span-2 ${toneClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.24em] text-accent">{eyebrow}</p>
          <h3 className="mt-2 text-lg font-semibold text-text">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted">{body}</p>
          {meta ? <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div> : null}
        </div>
        {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
      </div>
    </article>
  );
}

export function RewardFeedbackCard({
  eyebrow,
  title,
  subtitle,
  xpAwarded,
  newTotalXp,
  newLevel,
  attributeChanges,
  emphasis = "light",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  xpAwarded: number;
  newTotalXp: number;
  newLevel: number;
  attributeChanges: RewardAttributeChange[];
  emphasis?: "light" | "strong" | "raid";
}) {
  const toneClass =
    emphasis === "raid"
      ? "border-rose-300/30 bg-rose-300/10 mission-complete-rise"
      : emphasis === "strong"
        ? "border-accent/45 bg-accent/10 reward-flash"
        : "border-line bg-panel/70 reward-flash";

  return (
    <article className={`rounded-3xl border p-5 shadow-panel ${toneClass}`}>
      <p className="text-xs uppercase tracking-[0.25em] text-accent">{eyebrow}</p>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-text">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm leading-6 text-muted">{subtitle}</p> : null}
        </div>
        <div className="rounded-2xl border border-accent/25 bg-accent/10 px-4 py-3 text-right">
          <p className="text-[11px] uppercase tracking-[0.22em] text-accent">XP Awarded</p>
          <p className="mt-2 text-xl font-semibold text-text">+{xpAwarded}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MetricTile label="New total XP" value={String(newTotalXp)} />
        <MetricTile label="New level" value={String(newLevel)} />
        <MetricTile label="Attributes moved" value={String(attributeChanges.length)} />
      </div>

      {attributeChanges.length ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {attributeChanges.map((change) => (
            <div
              key={change.code}
              className="rounded-2xl border border-line bg-canvas/45 px-3 py-2 text-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-text">{labelize(change.code)}</span>
                <span className="font-medium text-accent">+{change.delta}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function StateCard({
  eyebrow,
  title,
  body,
  action,
  tone = "neutral",
}: {
  eyebrow: string;
  title: string;
  body: string;
  action?: ReactNode;
  tone?: "neutral" | "raid" | "warning";
}) {
  const toneClass =
    tone === "raid"
      ? "border-rose-400/22 bg-rose-400/6"
      : tone === "warning"
        ? "border-amber-400/20 bg-amber-400/5"
        : "border-line bg-panel/70";

  return (
    <article className={`rounded-3xl border p-5 shadow-panel ${toneClass}`}>
      <p className="text-xs uppercase tracking-[0.25em] text-accent">{eyebrow}</p>
      <h3 className="mt-3 text-xl font-semibold tracking-tight text-text">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </article>
  );
}

export function QuickProgressButton({
  label,
  onClick,
  disabled = false,
  tone = "default",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "raid";
}) {
  const buttonClass =
    tone === "raid"
      ? "bg-rose-300 text-slate-950 hover:opacity-90"
      : "bg-accent text-canvas hover:opacity-90";

  return (
    <button
      type="button"
      className={`rounded-2xl px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${buttonClass}`}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-canvas/45 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.22em] text-muted">{label}</p>
      <p className="mt-2 text-base font-medium text-text">{value}</p>
    </div>
  );
}

function labelize(code: string): string {
  return code.charAt(0).toUpperCase() + code.slice(1);
}
