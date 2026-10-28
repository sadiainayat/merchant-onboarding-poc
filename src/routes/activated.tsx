import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataRow, Page, Panel } from "@/components/abl/AppShell";
import { getCaseFn } from "@/lib/onboarding/cases.functions";
import type { CaseRow } from "@/lib/onboarding/rules";

export const Route = createFileRoute("/activated")({
  validateSearch: (s: Record<string, unknown>) => ({ case: String(s["case"] ?? "") }),
  head: () => ({
    meta: [
      { title: "Merchant activated — Allied Bank" },
      { name: "description", content: "Straight-through merchant activation confirmation." },
      { property: "og:title", content: "Merchant activated — Allied Bank" },
      { property: "og:description", content: "Straight-through merchant activation confirmation." },
    ],
  }),
  component: Activated,
});

function Activated() {
  const { case: caseId } = Route.useSearch();
  const [c, setC] = useState<CaseRow | null>(null);
  useEffect(() => { getCaseFn({ data: { id: caseId } }).then(setC).catch((e) => toast.error(e.message)); }, [caseId]);

  return (
    <Page width="narrow">
      <div className="text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-success-soft text-success"><CheckCircle2 className="size-8" /></div>
        <h1 className="mt-5 text-2xl font-bold text-primary sm:text-3xl">Case activated</h1>
        <p className="mt-2 text-sm text-muted-foreground">No further review needed — straight-through path.</p>
      </div>
      <Panel className="mt-8">
        <DataRow label="Reference" value={c?.reference} />
        <DataRow label="Merchant" value={c?.business_name || c?.owner_name} />
        <DataRow label="Product issued" value={c?.products[0]} />
        <DataRow label="Settlement" value="Allied account ·0241" />
      </Panel>
      <div className="mt-8 flex flex-col items-center gap-2">
        <div className="flex size-36 items-center justify-center rounded-lg border bg-card shadow-card"><QrCode className="size-24 text-primary" /></div>
        <span className="text-xs text-muted-foreground">Sample QR — illustrative only</span>
      </div>
      <div className="mt-8 flex flex-col gap-3">
        <Button asChild variant="accent" size="lg"><Link to="/tracking" search={{ case: caseId }}>Track this case →</Link></Button>
        <Link to="/" className="text-center text-sm font-semibold text-primary hover:underline">Start a new case</Link>
      </div>
    </Page>
  );
}
