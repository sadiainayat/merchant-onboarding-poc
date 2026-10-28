import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Camera, CheckCircle2, MapPin, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DataRow, Notice, Page, PageHeader, Panel } from "@/components/abl/AppShell";
import {
  confirmNameOverride, getCaseFn, scanCnicFn, submitCase, updateBusiness, updateProducts, updateWho,
} from "@/lib/onboarding/cases.functions";
import type { CaseRow, Routing } from "@/lib/onboarding/rules";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/capture")({
  validateSearch: (s: Record<string, unknown>) => ({ case: String(s.case ?? "") }),
  head: () => ({
    meta: [
      { title: "Capture application — Allied Bank" },
      { name: "description", content: "Capture merchant identity, business and product details." },
      { property: "og:title", content: "Capture application — Allied Bank" },
      { property: "og:description", content: "Capture merchant identity, business and product details." },
    ],
  }),
  component: Capture,
});

const STEPS = ["Who", "Identity", "Business & outlet", "Products", "Review"];
const PRODUCTS: [string, string][] = [
  ["Raast QR", "Raast QR (static / dynamic)"], ["Soundbox", "Soundbox"], ["Android POS", "Android POS"],
  ["SoftPOS", "SoftPOS"], ["E-commerce gateway", "E-commerce gateway"],
];

function fileToDataUrl(file: File) {
  return new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function Field({ label, hint, ...props }: { label: string; hint?: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={props.id} className="text-sm font-medium">{label}</Label>
      <Input className="h-10 bg-card" {...props} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Capture() {
  const { case: caseId } = Route.useSearch();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [c, setC] = useState<CaseRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [who, setWho] = useState({ owner_name: "", phone: "" });
  const [biz, setBiz] = useState({ business_name: "", business_address: "", category: "" });
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [preview, setPreview] = useState<Routing | null>(null);

  useEffect(() => {
    getCaseFn({ data: { id: caseId } }).then((d) => {
      setC(d);
      setWho({ owner_name: d.declared_name || "", phone: d.phone || "" });
      setBiz({ business_name: d.business_name || "", business_address: d.business_address || "", category: d.category || "" });
    }).catch((e) => toast.error(e.message));
  }, [caseId]);

  const saveProducts = useCallback(async (products: string[]) => {
    try {
      const r = await updateProducts({ data: { id: caseId, products } });
      setC(r);
      setPreview(r.eligibilityPreview);
    } catch (e) { toast.error((e as Error).message); }
  }, [caseId]);

  useEffect(() => { if (step === 4 && c) saveProducts(c.products); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (!c) return <Page><div className="h-40 animate-pulse rounded-lg bg-muted" /></Page>;

  const mismatch = !!c.cnic_scanned && c.name_match_score != null && c.name_match_score < 0.6 && !c.name_override;
  const scorePct = c.name_match_score != null ? Math.round(c.name_match_score * 100) : null;

  async function scan() {
    if (!front) { toast.error("Please choose a front-image file."); return; }
    setBusy(true);
    try {
      const [f, b] = await Promise.all([fileToDataUrl(front), back ? fileToDataUrl(back) : Promise.resolve(null)]);
      const r = await scanCnicFn({ data: { id: caseId, frontBase64: f, backBase64: b } });
      setC(r);
      if (r.ocrSource === "stub-fallback") toast.warning("Card reader unavailable — showing a sample reading instead.", { description: r.ocrError || undefined });
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  }

  async function next() {
    setBusy(true);
    try {
      if (step === 1) setC(await updateWho({ data: { id: caseId, ...who } }));
      else if (step === 3) setC(await updateBusiness({ data: { id: caseId, ...biz } }));
      else if (step === 5) {
        await submitCase({ data: { id: caseId } });
        navigate({ to: "/checks", search: { case: caseId } });
        return;
      }
      setStep((s) => Math.min(5, s + 1));
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <Page>
      <PageHeader eyebrow={`Case ${c.reference} · ${c.channel}`} title="Capture application" />

      <ol className="mb-8 grid grid-cols-5 gap-2">
        {STEPS.map((s, i) => (
          <li key={s}>
            <div className={cn("h-1 rounded-full", i + 1 < step ? "bg-primary" : i + 1 === step ? "bg-brand-orange" : "bg-border")} />
            <div className={cn("mt-2 hidden text-xs font-medium sm:block", i + 1 === step ? "text-primary" : "text-muted-foreground")}>
              {i + 1}. {s}
            </div>
          </li>
        ))}
      </ol>
      <h2 className="mb-4 text-lg font-semibold text-primary sm:hidden">Step {step} of 5 — {STEPS[step - 1]}</h2>

      <Panel>
        {step === 1 && (
          <div className="space-y-5">
            <Field id="owner_name" label="Merchant / owner name" placeholder="e.g. Muhammad Imran Tariq" value={who.owner_name}
              onChange={(e) => setWho({ ...who, owner_name: e.target.value })} hint="This is checked against the name on the CNIC in the next step." />
            <Field id="phone" label="Phone number" placeholder="0300-1234567" value={who.phone} onChange={(e) => setWho({ ...who, phone: e.target.value })} />
          </div>
        )}

        {step === 2 && !c.cnic_scanned && (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">Upload a photo of the CNIC — front required, back optional (for the address). The fields are read automatically for you to confirm.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="front">CNIC — front</Label>
                <Input id="front" type="file" accept="image/*" className="bg-card" onChange={(e) => setFront(e.target.files?.[0] ?? null)} /></div>
              <div className="space-y-1.5"><Label htmlFor="back">CNIC — back (optional)</Label>
                <Input id="back" type="file" accept="image/*" className="bg-card" onChange={(e) => setBack(e.target.files?.[0] ?? null)} /></div>
            </div>
            <Button variant="accent" className="w-full" onClick={scan} disabled={busy}>{busy ? "Reading the card…" : "Extract fields"}</Button>
          </div>
        )}

        {step === 2 && c.cnic_scanned && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-success"><CheckCircle2 className="size-4" /> Read from CNIC photo — confirm each field</div>
            <div>
              <DataRow label="Name (CNIC)" value={c.owner_name} />
              <DataRow label="CNIC number" value={c.cnic_number} />
              <DataRow label="Date of birth" value={c.cnic_dob} />
              <DataRow label="Father's name" value={c.cnic_father_name} />
            </div>
            <Notice tone="warning" title={c.cnic_address_confidence === "low" ? "Address — low confidence, please confirm" : "Address — confirm"}>
              {c.cnic_address || "(no address read — upload the back of the card for this)"}
            </Notice>
            {c.declared_name && (mismatch ? (
              <div className="rounded-md border border-destructive/30 bg-destructive-soft p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-destructive"><XCircle className="size-4" /> Name doesn’t match the CNIC</div>
                <DataRow label="You entered" value={c.declared_name} />
                <DataRow label="CNIC reads" value={c.owner_name} />
                <p className="my-3 text-sm text-muted-foreground">Match score: {scorePct}% — below the threshold. This could be a typo, the wrong card, or a different person.</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Go back and fix the name</Button>
                  <Button variant="danger" className="flex-1" onClick={async () => setC(await confirmNameOverride({ data: { id: caseId } }))}>Same person — confirm &amp; flag</Button>
                </div>
              </div>
            ) : (
              <div className="rounded-md border p-4">
                <DataRow label="Declared at intake" value={c.declared_name} />
                <DataRow label="Match with CNIC" value={<span className="text-success">{scorePct}% — OK</span>} />
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <Field id="business_name" label="Business name" placeholder="e.g. Imran Hosiery Store" value={biz.business_name} onChange={(e) => setBiz({ ...biz, business_name: e.target.value })} />
            <Field id="business_address" label="Business / outlet address" placeholder="Shop 14, Hall Road, Lahore" value={biz.business_address} onChange={(e) => setBiz({ ...biz, business_address: e.target.value })} />
            <Field id="category" label="Merchant category" placeholder="Retail — General Merchandise" value={biz.category} onChange={(e) => setBiz({ ...biz, category: e.target.value })} />
            {c.channel === "field-agent" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Notice tone="neutral"><span className="flex items-center gap-2"><MapPin className="size-4 text-primary" /> GPS will be captured at the shop</span></Notice>
                <Notice tone="neutral"><span className="flex items-center gap-2"><Camera className="size-4 text-primary" /> Shop front photo will be attached</span></Notice>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Select the products this case is requesting.</p>
            {PRODUCTS.map(([val, label]) => {
              const checked = c.products.includes(val);
              return (
                <label key={val} className={cn("flex cursor-pointer items-center gap-3 rounded-md border p-3.5 transition-colors", checked ? "border-primary/50 bg-secondary" : "hover:bg-muted")}>
                  <Checkbox checked={checked} onCheckedChange={(v) => {
                    const products = v ? [...c.products, val] : c.products.filter((p) => p !== val);
                    setC({ ...c, products });
                    saveProducts(products);
                  }} />
                  <span className="text-sm font-medium">{label}</span>
                </label>
              );
            })}
            {c.products.length === 0 || !preview ? <Notice tone="warning" title="Select at least one product." />
              : preview.straightThrough ? <Notice tone="success" title="Eligible for same-day activation">Micro, existing customer, QR/soundbox only.</Notice>
              : <Notice tone="warning" title="Will go to the ops queue for review">{preview.reason}</Notice>}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Review before submitting. Nothing is final until this is confirmed.</p>
            <div>
              <DataRow label="Merchant" value={c.owner_name || "—"} />
              <DataRow label="CNIC" value={c.cnic_number || "—"} />
              <DataRow label="Business" value={c.business_name || "—"} />
              <DataRow label="Address" value={c.business_address || "—"} />
              <DataRow label="Products" value={c.products.join(", ") || "None selected"} />
              <DataRow label="Tier" value={`${c.tier} · ${c.existing_customer ? "existing Allied customer" : "new to bank"}`} />
            </div>
            {c.declared_name && c.name_match_score != null && c.name_match_score < 0.6 && (
              <Notice tone="warning" title="Name mismatch acknowledged">
                Declared as “{c.declared_name}”, CNIC reads “{c.owner_name}” — flagged, and will go to manual review regardless of other checks.
              </Notice>
            )}
          </div>
        )}
      </Panel>

      <div className="mt-6 flex gap-3">
        <Button variant="outline" size="lg" disabled={step === 1 || busy} onClick={() => setStep((s) => s - 1)}>Back</Button>
        <Button size="lg" className="flex-1" disabled={busy || (step === 2 && (mismatch || !c.cnic_scanned))}
          title={step === 2 && mismatch ? "Resolve the name mismatch before continuing." : undefined} onClick={next}>
          {step === 5 ? "Submit case" : "Next"}
        </Button>
      </div>
    </Page>
  );
}
