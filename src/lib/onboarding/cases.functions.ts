import { createServerFn } from "@tanstack/react-start";
import { similarity } from "./nameMatch";
import { decideRouting, runAllChecks, TRACKING_MESSAGES, type CaseRow, type CheckResult, type Routing } from "./rules";

// This app has no sign-in (same as the original POC); all data access goes
// through these server functions with the server-side client.
async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function toCase(row: Record<string, unknown>): CaseRow {
  return { ...(row as unknown as CaseRow), products: Array.isArray(row["products"]) ? (row["products"] as string[]) : [] };
}

async function getCase(id: string): Promise<CaseRow> {
  const { data, error } = await (await db()).from("cases").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Case not found.");
  return toCase(data);
}

async function update(id: string, patch: Record<string, unknown>): Promise<CaseRow> {
  const { data, error } = await (await db())
    .from("cases").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  return toCase(data);
}

const str = (v: unknown) => (typeof v === "string" ? v : undefined);
function idInput(d: unknown) {
  const id = str((d as { id?: unknown })?.id);
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid case id.");
  return d as { id: string; owner_name?: unknown; phone?: unknown; frontBase64?: unknown; backBase64?: unknown;
    business_name?: unknown; business_address?: unknown; category?: unknown; products?: unknown; decision?: unknown; note?: unknown };
}

function makeReference() {
  const ymd = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  return `MO-${ymd}-${Math.floor(100000 + Math.random() * 900000)}`;
}

export const createCase = createServerFn({ method: "POST" })
  .inputValidator((d: { channel: string }) => {
    if (!["self-service", "field-agent", "branch"].includes(d?.channel)) throw new Error("Invalid channel.");
    return d;
  })
  .handler(async ({ data }) => {
    const { data: row, error } = await (await db())
      .from("cases").insert({ reference: makeReference(), channel: data.channel, tier: "Micro", existing_customer: true, status: "draft" })
      .select("*").single();
    if (error) throw new Error(error.message);
    return toCase(row);
  });

export type CaseWithChecks = CaseRow & { checks: Omit<CheckResult, "passed">[] };

export const getCaseFn = createServerFn({ method: "GET" })
  .inputValidator(idInput)
  .handler(async ({ data }): Promise<CaseWithChecks> => {
    const c = await getCase(data.id);
    const { data: checks } = await (await db())
      .from("checks").select("name, mode, status, message, reference").eq("case_id", c.id).order("id");
    return { ...c, checks: (checks || []) as CaseWithChecks["checks"] };
  });

export const updateWho = createServerFn({ method: "POST" })
  .inputValidator(idInput)
  .handler(async ({ data }) => {
    const row = await getCase(data.id);
    const declared = str(data.owner_name) ?? row.declared_name;
    const patch: Record<string, unknown> = { declared_name: declared, phone: str(data.phone) ?? row.phone };
    if (row.cnic_scanned) {
      patch["name_match_score"] = similarity(declared, row.owner_name);
      patch["name_override"] = false;
    }
    return update(row.id, patch);
  });

export const scanCnicFn = createServerFn({ method: "POST" })
  .inputValidator(idInput)
  .handler(async ({ data }) => {
    const row = await getCase(data.id);
    const { scanCnic } = await import("./cnicOcr.server");
    const ex = await scanCnic({ frontBase64: str(data.frontBase64) ?? null, backBase64: str(data.backBase64) ?? null });
    const score = similarity(row.declared_name, ex.owner_name);
    const updated = await update(row.id, {
      owner_name: ex.owner_name, cnic_number: ex.cnic_number, cnic_dob: ex.cnic_dob,
      cnic_father_name: ex.cnic_father_name, cnic_address: ex.cnic_address,
      cnic_address_confidence: ex.cnic_address_confidence, cnic_scanned: true,
      name_match_score: score, name_override: false,
    });
    return { ...updated, ocrSource: ex._source, ocrError: ex._error, nameMismatch: score !== null && score < 0.6, nameMatchScore: score };
  });

export const confirmNameOverride = createServerFn({ method: "POST" })
  .inputValidator(idInput)
  .handler(async ({ data }) => update(data.id, { name_override: true }));

export const updateBusiness = createServerFn({ method: "POST" })
  .inputValidator(idInput)
  .handler(async ({ data }) => {
    const row = await getCase(data.id);
    return update(row.id, {
      business_name: str(data.business_name) ?? row.business_name,
      business_address: str(data.business_address) ?? row.business_address,
      category: str(data.category) ?? row.category,
    });
  });

export const updateProducts = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    const v = idInput(d);
    if (!Array.isArray(v.products) || !v.products.every((p) => typeof p === "string")) throw new Error("products must be an array.");
    return v as { id: string; products: string[] };
  })
  .handler(async ({ data }): Promise<CaseRow & { eligibilityPreview: Routing }> => {
    const updated = await update(data.id, { products: data.products });
    return { ...updated, eligibilityPreview: decideRouting(updated, []) };
  });

export const submitCase = createServerFn({ method: "POST" })
  .inputValidator(idInput)
  .handler(async ({ data }) => update(data.id, { status: "submitted" }));

export const runChecks = createServerFn({ method: "POST" })
  .inputValidator(idInput)
  .handler(async ({ data }) => {
    const c = await getCase(data.id);
    const client = await db();
    const { data: atl } = await client.from("fbr_atl").select("active, snapshot_date").eq("cnic", c.cnic_number ?? "").maybeSingle();
    const { data: dup } = await client.from("cases").select("reference")
      .eq("cnic_number", c.cnic_number ?? "").neq("id", c.id).neq("status", "declined").limit(1);
    const results = runAllChecks(c, { atl: atl ?? null, duplicateRef: dup?.[0]?.reference ?? null });
    await client.from("checks").insert(results.map((r) => ({
      case_id: c.id, name: r.name, mode: r.mode, status: r.status, message: r.message, reference: r.reference ?? null,
    })));
    const routing = decideRouting(c, results);
    const updated = await update(c.id, {
      status: routing.straightThrough ? "activated" : "queued", risk_band: routing.riskBand, queue_reason: routing.reason,
    });
    return { checks: results, routing, case: updated };
  });

export const getQueue = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await (await db()).from("cases").select("*").eq("status", "queued").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(toCase);
});

export const decideCase = createServerFn({ method: "POST" })
  .inputValidator(idInput)
  .handler(async ({ data }) => {
    const map: Record<string, string> = { approve: "approved", approve_limits: "approved_limits", query: "queried", decline: "declined" };
    const decision = str(data.decision);
    if (!decision || !map[decision]) throw new Error("Invalid decision.");
    return update(data.id, { status: map[decision], decision_note: str(data.note) || null, decided_by: "Ops reviewer" });
  });

export const getTracking = createServerFn({ method: "GET" })
  .inputValidator(idInput)
  .handler(async ({ data }) => {
    const c = await getCase(data.id);
    const { count } = await (await db()).from("checks").select("id", { count: "exact", head: true }).eq("case_id", c.id);
    const active = ["activated", "approved", "approved_limits"].includes(c.status);
    return {
      reference: c.reference,
      business_name: c.business_name,
      status: c.status,
      message: TRACKING_MESSAGES[c.status] || "Your application is being processed.",
      steps: [
        { title: "Submitted", done: c.status !== "draft" },
        { title: "Checks complete", done: (count ?? 0) > 0 },
        { title: "Activated", done: active },
        { title: "Device confirmed", done: false },
      ],
    };
  });
