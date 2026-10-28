import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import logo from "@/assets/abl-logo.png.asset.json";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "New application" },
  { to: "/queue", label: "Ops queue" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3" aria-label="Allied Bank — home">
            <img src={logo.url} alt="Allied Bank Limited" className="h-8 w-auto sm:h-9" />
            <span className="hidden border-l pl-3 text-sm font-medium text-muted-foreground md:inline">
              Merchant Onboarding
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: true }}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
                activeProps={{ className: "bg-secondary text-primary" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="h-0.5 bg-brand-orange" />
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} Allied Bank Limited. Digital merchant onboarding.</span>
          <span>Internal pilot · Sample data</span>
        </div>
      </footer>
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1 className="text-2xl font-bold text-primary sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Page({ children, width = "default" }: { children: ReactNode; width?: "narrow" | "default" | "wide" }) {
  return (
    <div className={cn("mx-auto px-4 py-10 sm:px-6", width === "narrow" ? "max-w-2xl" : width === "wide" ? "max-w-6xl" : "max-w-3xl")}>
      {children}
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-lg border bg-card p-5 shadow-card sm:p-6", className)}>{children}</div>;
}

export function DataRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2.5 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

type Tone = "success" | "warning" | "danger" | "neutral";
const TONE: Record<Tone, string> = {
  success: "border-success/30 bg-success-soft text-success",
  warning: "border-warning/30 bg-warning-soft text-warning",
  danger: "border-destructive/30 bg-destructive-soft text-destructive",
  neutral: "border-border bg-muted text-muted-foreground",
};

export function Notice({ tone, title, children, className }: { tone: Tone; title?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-md border px-4 py-3", TONE[tone], className)}>
      {title && <div className="text-sm font-semibold">{title}</div>}
      {children && <div className="mt-0.5 text-sm text-foreground/80">{children}</div>}
    </div>
  );
}

export function StatusPill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", TONE[tone])}>
      {children}
    </span>
  );
}

export function riskTone(r: string | null | undefined): Tone {
  return (r || "").startsWith("High") ? "danger" : (r || "").startsWith("Medium") ? "warning" : "success";
}
