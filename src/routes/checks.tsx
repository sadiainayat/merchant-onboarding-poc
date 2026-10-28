import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Notice, Page, PageHeader, Panel, StatusPill } from "@/components/abl/AppShell";
import { getCaseFn, runChecks } from "@/lib/onboarding/cases.functions";
import { FAIL_STATUSES, type CaseRow } from "@/lib/onboarding/rules";

export const Route = createFileRoute("/checks")({
  validateSearch: (s: Record<string, unknown>) => ({ case: String(s.case ?? "") }),
  head: () => ({
    meta: [
      { title: "Verification checks — Allied Bank" },
      { name: "description", content: "Run identity, tax and compliance checks on a merchant application." },
      { property: "og:title", content: "Verification checks — Allied Bank" },
      { property: "og:description", content: "Run identity, tax and compliance checks on a merchant application." },
    ],
  }),
  component: Checks,
});

type Check = { name: string; mode: string; status: string; message: string | null; reference?: string | null; passed: boolean };

function Checks() {
  const { case: caseId } = Route.useSearch();
  const [c, setC] = useState<CaseRow | null>(null);
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getCaseFn({ data: { id: caseId } }).then((d) => {
      setC(d);
      if (d.checks.length) setChecks(d.checks.map((x) => ({ ...x, passed: !FAIL_STATUSES.has(x.status) })));
    }).catch((e) => toast.error(e.message));
  }, [caseId]);

  async function run() {
    setBusy(true);
    try {
      const r = await runChecks({ data: { id: caseId } });
      setC(r.case);
      setChecks(r.checks);
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  }

  return (
    <Page>
      <PageHeader eyebrow={c ? `Case ${c.reference}` : "Case"} title="Verification checks" description="Seven checks run against the case before routing." />
      {!checks ? (
        <Panel className="py-12 text-center">
          <Button variant="accent" size="lg" onClick={run} disabled={busy || !c}>{busy ? "Running checks…" : "Run checks"}</Button>
          <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
            Name consistency, FBR and the duplicate check are real logic; the other four are simulated. FBR represents the weekly Active Taxpayer List pull.
          </p>
        </Panel>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border bg-card shadow-card">
            {checks.map((x) => {
              const amber = x.status.includes("review") || x.status === "Not required" || x.status === "Override confirmed";
              return (
                <div key={x.name} className="flex items-start justify-between gap-4 border-b p-4 last:border-b-0">
                  <div>
                    <div className="font-semibold text-primary">{x.name}</div>
                    <div className="mt-0.5 text-sm text-muted-foreground">
                      <span className="font-medium">{x.mode === "real" ? "Real" : "Simulated"}</span> — {x.message}
                    </div>
                    {x.reference && <div className="mt-1 font-mono text-xs text-muted-foreground">{x.reference}</div>}
                  </div>
                  <StatusPill tone={x.passed && !amber ? "success" : amber ? "warning" : "danger"}>{x.status}</StatusPill>
                </div>
              );
            })}
          </div>
          <div className="mt-6 space-y-4">
            {c?.status === "activated" ? (
              <>
                <Notice tone="success" title="Straight-through eligible">Micro tier, existing Allied customer, QR/soundbox only, all checks passed.</Notice>
                <Button asChild size="lg" className="w-full"><Link to="/activated" search={{ case: caseId }}>Continue to activation</Link></Button>
              </>
            ) : (
              <>
                <Notice tone="warning" title="Routed to the ops queue">{c?.queue_reason}</Notice>
                <Button asChild size="lg" className="w-full"><Link to="/queue" search={{ case: caseId }}>Go to the ops queue</Link></Button>
              </>
            )}
          </div>
        </>
      )}
    </Page>
  );
}
