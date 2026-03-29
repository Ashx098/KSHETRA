import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import type { AppSection } from "@kshetra/types";

const navigation: Array<{ href: string; label: string; section: AppSection }> = [
  { href: "/", label: "Home", section: "home" },
  { href: "/missions", label: "Missions", section: "missions" },
  { href: "/progress", label: "Progress", section: "progress" },
  { href: "/profile", label: "Profile", section: "profile" },
];

interface AppShellProps {
  section: AppSection;
  title: string;
  description: string;
  children: ReactNode;
}

export function AppShell({
  section,
  title,
  description,
  children,
}: AppShellProps): ReactElement {
  return (
    <div className="min-h-screen bg-canvas text-text">
      <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col px-4 py-5 sm:px-7 lg:flex-row lg:gap-6 lg:px-8">
        <aside className="mb-6 rounded-3xl border border-line bg-panel/80 p-5 shadow-panel lg:mb-0 lg:w-[248px] lg:p-5">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.3em] text-accent">
              KSHETRA
            </p>
            <h1 className="mt-3 text-2xl font-semibold leading-tight">Structured Progression</h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              Premium life system. Deterministic truth remains backend-owned.
            </p>
          </div>

          <div className="mb-5 rounded-2xl border border-accent/20 bg-accent/5 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.28em] text-accent/90">Current Build</p>
            <div className="mt-3 space-y-2 text-sm text-muted">
              <p className="flex items-center justify-between gap-3">
                <span>Daily loop</span>
                <span className="rounded-full bg-emerald-500/12 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-emerald-300">
                  Live
                </span>
              </p>
              <p className="flex items-center justify-between gap-3">
                <span>Progress view</span>
                <span className="rounded-full bg-emerald-500/12 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-emerald-300">
                  Live
                </span>
              </p>
              <p className="flex items-center justify-between gap-3">
                <span>Missions surface</span>
                <span className="rounded-full bg-canvas/80 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-muted">
                  Pending
                </span>
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2 lg:flex-col">
            {navigation.map((item) => {
              const active = section === item.section;
              const pending = item.section === "missions";

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${
                    active
                      ? "border-accent bg-accent/10 text-text"
                      : "border-line bg-canvas/40 text-muted hover:border-accent/60 hover:text-text"
                  }`}
                >
                  <span>{item.label}</span>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${
                      active
                        ? "bg-accent/15 text-accent"
                        : pending
                          ? "bg-canvas/80 text-muted"
                          : "bg-emerald-500/12 text-emerald-300"
                    }`}
                  >
                    {pending ? "Soon" : active ? "Open" : "Ready"}
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1">
          <section className="rounded-3xl border border-line bg-panel/80 p-6 shadow-panel sm:p-8">
            <p className="text-xs uppercase tracking-[0.3em] text-accent">
              {section}
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted sm:text-base">
              {description}
            </p>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2">{children}</section>
        </main>
      </div>
    </div>
  );
}

interface PlaceholderPanelProps {
  label: string;
  detail: string;
}

export function PlaceholderPanel({
  label,
  detail,
}: PlaceholderPanelProps): ReactElement {
  return (
    <article className="rounded-3xl border border-line bg-panel/70 p-5 shadow-panel">
      <p className="text-xs uppercase tracking-[0.25em] text-accent">{label}</p>
      <p className="mt-3 text-sm leading-6 text-muted">{detail}</p>
    </article>
  );
}
