import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Notice, Page, PageHeader, Panel, StatusPill, riskTone } from "@/components/abl/AppShell";
import { decideCase, getQueue } from "@/lib/onboarding/cases.functions";
import type { CaseRow } from "@/lib/onboarding/rules";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/queue")({
  validateSearch: (s: Record<string, unknown>) => ({ case: s.case ? String(s.case) : undefined }),
  head: () => ({
    meta: [
      { title: "Ops review queue — Allied Bank" },
      { name: "description", content: "Maker-checker review of merchant applications not eligible for straight-through activation." },
      { property: "og:title", content: "Ops review queue — Allied Bank" },
      { property: "og:description", content: "Maker-checker review of merchant applications not eligible for straight-through activation." },
    ],
  }),
  component: Queue,
});

function Queue() {
  const search = Route.useSearch();
  const [cases, setCases] = useState<CaseRow[] | null>(null);
  const [selected, setSelected] = useState<string | undefined>(search.case);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (keep?: string) => {
    const list = await getQueue();
    setCases(list);
    setSelected(keep && list.find((x) => x.id === keep) ? keep : list[0]?.id);
  }, []);

  useEffect(() => { load(search.case).catch((e) => toast.error(e.message)); }, [load, search.case]);

  const c = cases?.find((x) => x.id === selected);

  async function decide(decision: string) {
    if (!c) return;
    setBusy(true);
    try {
      await decideCase({ data: { id: c.id, decision, note } });
      toast.success(`Decision recorded for ${c.reference}.`);
      setNote("");
      await load();
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  }

  return (
    <Page width="wide">
      <PageHeader eyebrow="Maker-checker" title="Ops review queue" description="Cases that didn’t qualify for straight-through activation."
        actions={cases && <span className="text-sm text-muted-foreground">{cases.length} pending</span>} />
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="overflow-hidden rounded-lg border bg-card shadow-card">
          {!cases ? <div className="p-6 text-sm text-muted-foreground">Loading…</div>
            : cases.length === 0 ? <div className="p-6 text-sm text-muted-foreground">Nothing in the queue right now.</div>
            : cases.map((x) => (
              <button key={x.id} onClick={() => setSelected(x.id)}
                className={cn("block w-full border-b border-l-4 p-4 text-left transition-colors last:border-b-0",
                  x.id === selected ? "border-l-brand-orange bg-secondary" : "border-l-transparent hover:bg-muted")}>
                <div className="font-semibold text-primary">{x.business_name || x.owner_name || "Unnamed case"}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{x.reference} · {x.products.join(", ")}</div>
                <div className="mt-2"><StatusPill tone={riskTone(x.risk_band)}>{x.risk_band}</StatusPill></div>
              </button>
            ))}
        </div>

        <Panel>
          {!c ? <p className="text-sm text-muted-foreground">Select a case from the list.</p> : (
            <>
              <div className="eyebrow">Case detail · {c.reference}</div>
              <h2 className="mt-1 mb-5 text-xl font-bold text-primary">{c.business_name || c.owner_name}</h2>
              <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                {[["Tier", c.tier], ["Products", c.products.join(", ")], ["Risk band", c.risk_band], ["Captured by", c.channel]].map(([k, v]) => (
                  <div key={k} className="rounded-md border bg-muted/50 p-3">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{k}</div>
                    <div className="mt-1 text-sm font-semibold">{v}</div>
                  </div>
                ))}
              </div>
              <Notice tone="warning" title="Why this is queued" className="mb-5">{c.queue_reason}</Notice>
              <div className="mb-5 space-y-1.5">
                <Label htmlFor="note">Decision note</Label>
                <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note for the record…" className="min-h-20 bg-card" />
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <Button disabled={busy} onClick={() => decide("approve")}>Approve</Button>
                <Button variant="success" disabled={busy} onClick={() => decide("approve_limits")}>Approve with limits</Button>
                <Button variant="warning" disabled={busy} onClick={() => decide("query")}>Query</Button>
                <Button variant="danger" disabled={busy} onClick={() => decide("decline")}>Decline</Button>
              </div>
            </>
          )}
        </Panel>
      </div>
    </Page>
  );
}
