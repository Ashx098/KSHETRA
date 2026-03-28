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
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-6 sm:px-8 lg:flex-row lg:gap-8 lg:px-10">
        <aside className="mb-8 rounded-3xl border border-line bg-panel/80 p-5 shadow-panel lg:mb-0 lg:w-72 lg:p-6">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.3em] text-accent">
              KSHETRA
            </p>
            <h1 className="mt-3 text-2xl font-semibold">Structured Progression</h1>
            <p className="mt-2 text-sm text-muted">
              Deterministic state lives in the backend. The frontend presents and edits persisted data only.
            </p>
          </div>

          <nav className="flex flex-wrap gap-3 lg:flex-col">
            {navigation.map((item) => {
              const active = section === item.section;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-2xl border px-4 py-3 text-sm transition ${
                    active
                      ? "border-accent bg-accent/10 text-text"
                      : "border-line bg-canvas/40 text-muted hover:border-accent/60 hover:text-text"
                  }`}
                >
                  {item.label}
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
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">{title}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
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
