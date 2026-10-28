import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Page, PageHeader, Panel } from "@/components/abl/AppShell";
import { getTracking } from "@/lib/onboarding/cases.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tracking")({
  validateSearch: (s: Record<string, unknown>) => ({ case: String(s.case ?? "") }),
  head: () => ({
    meta: [
      { title: "Track your application — Allied Bank" },
      { name: "description", content: "Follow the status of your Allied Bank merchant application." },
      { property: "og:title", content: "Track your application — Allied Bank" },
      { property: "og:description", content: "Follow the status of your Allied Bank merchant application." },
    ],
  }),
  component: Tracking,
});

type T = Awaited<ReturnType<typeof getTracking>>;

function Tracking() {
  const { case: caseId } = Route.useSearch();
  const [t, setT] = useState<T | null>(null);
  useEffect(() => { getTracking({ data: { id: caseId } }).then(setT).catch((e) => toast.error(e.message)); }, [caseId]);

  const active = t && ["activated", "approved", "approved_limits"].includes(t.status);
  const subs: Record<string, string> = {
    Submitted: "Case received", "Checks complete": "All checks run",
    Activated: active ? "Product issued" : "Pending outcome", "Device confirmed": "Pending first scan",
  };

  return (
    <Page narrow-width="true" width="narrow">
      <PageHeader eyebrow="Application status" title={t?.reference ?? "—"} description={t && `${t.business_name || ""} — ${t.message}`} />
      <Panel>
        <ol>
          {t?.steps.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={cn("flex size-8 items-center justify-center rounded-full text-sm font-semibold",
                  s.done ? "bg-primary text-primary-foreground" : "border-2 border-border bg-card text-muted-foreground")}>
                  {s.done ? <Check className="size-4" /> : i + 1}
                </div>
                {i < t.steps.length - 1 && <div className={cn("my-1 w-0.5 flex-1 min-h-8", s.done ? "bg-primary" : "bg-border")} />}
              </div>
              <div className="pb-6 pt-1">
                <div className={cn("font-semibold", s.done ? "text-primary" : "text-muted-foreground")}>{s.title}</div>
                <div className="text-sm text-muted-foreground">{subs[s.title]}</div>
              </div>
            </li>
          ))}
        </ol>
      </Panel>
      <p className="mt-4 text-xs text-muted-foreground">Merchants only see status and a plain-language reason here — never the internal risk score or check details.</p>
      <Link to="/" className="mt-6 inline-block text-sm font-semibold text-primary hover:underline">← Back to start</Link>
    </Page>
  );
}
