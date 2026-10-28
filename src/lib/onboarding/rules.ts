// Checks + routing rules, ported from the original POC. Pure functions —
// database lookups are passed in so these stay testable.

export type CaseRow = {
  id: string;
  reference: string;
  channel: string;
  tier: string | null;
  existing_customer: boolean | null;
  owner_name: string | null;
  phone: string | null;
  cnic_number: string | null;
  cnic_dob: string | null;
  cnic_father_name: string | null;
  cnic_address: string | null;
  cnic_address_confidence: string | null;
  cnic_scanned: boolean | null;
  business_name: string | null;
  business_address: string | null;
  category: string | null;
  products: string[];
  status: string;
  risk_band: string | null;
  queue_reason: string | null;
  decision_note: string | null;
  decided_by: string | null;
  declared_name: string | null;
  name_match_score: number | null;
  name_override: boolean | null;
  created_at: string;
};

export type CheckResult = {
  name: string;
  mode: "real" | "simulated";
  status: string;
  message: string;
  reference?: string | null;
  passed: boolean;
};

export const FAIL_STATUSES = new Set([
  "Hit — needs review", "Duplicate found", "Inactive", "Manual review",
  "Could not verify", "No ATL record", "Mismatch", "Override confirmed",
]);

type R = { status: string; message: string; reference?: string };
export type Lookups = {
  atl: { active: boolean; snapshot_date: string } | null;
  duplicateRef: string | null;
};

function nameConsistency(c: CaseRow): R {
  if (!c.declared_name) return { status: "Not captured", message: "No declared name captured at intake to compare against the CNIC." };
  const score = c.name_match_score;
  if (c.name_override) return { status: "Override confirmed", message: `Declared name and CNIC name didn’t match (score ${(score ?? 0).toFixed(2)}) — capturer confirmed same person; routed for manual review.` };
  if (score != null && score < 0.6) return { status: "Mismatch", message: `Declared name "${c.declared_name}" does not match the CNIC name "${c.owner_name}" (score ${score.toFixed(2)}).` };
  return { status: "Pass", message: "Declared name matches the name read off the CNIC." };
}
function nadra(c: CaseRow): R {
  if (!/^\d{5}-\d{7}-\d$/.test(c.cnic_number || "")) return { status: "Could not verify", message: "CNIC format did not match NADRA’s record layout." };
  return { status: "Pass", message: "Name, CNIC number and date of birth matched NADRA’s record." };
}
function fbr(_c: CaseRow, l: Lookups): R {
  if (!l.atl) return { status: "No ATL record", message: "CNIC not found in the latest ATL snapshot.", reference: "n/a" };
  return {
    status: l.atl.active ? "Active" : "Inactive",
    message: l.atl.active ? "Found as an active taxpayer in the latest ATL snapshot." : "Found but marked inactive in the latest ATL snapshot.",
    reference: `ATL-${l.atl.snapshot_date}`,
  };
}
function aml(c: CaseRow): R {
  if ((c.business_name || "").toLowerCase().includes("chaudhry")) return { status: "Hit — needs review", message: "Name-match hit against the sanctions/PEP watchlist. Needs manual review." };
  return { status: "Pass", message: "No match against AML, PEP or sanctions lists." };
}
function accountTitle(c: CaseRow): R {
  if (!c.owner_name) return { status: "Could not verify", message: "No owner name captured to compare against the account title." };
  return { status: "Pass", message: "Account title matches the CNIC holder’s name (fuzzy match, allows for transliteration)." };
}
function duplicate(_c: CaseRow, l: Lookups): R {
  if (l.duplicateRef) return { status: "Duplicate found", message: `Same CNIC already on an open case (${l.duplicateRef}).` };
  return { status: "Pass", message: "No other open case found for this CNIC." };
}
function secp(c: CaseRow): R {
  if (c.tier !== "Registered") return { status: "Not required", message: "SECP registration only applies to the Registered tier." };
  if ((c.business_name || "").toLowerCase().includes("pending inc")) return { status: "Manual review", message: "Incorporation record not confirmed — needs a manual SECP lookup." };
  return { status: "Pass", message: "Incorporation record confirmed against SECP’s company search." };
}

export function runAllChecks(c: CaseRow, l: Lookups): CheckResult[] {
  const defs: [string, "real" | "simulated", (c: CaseRow, l: Lookups) => R][] = [
    ["Name consistency", "real", nameConsistency],
    ["NADRA Verisys", "simulated", nadra],
    ["FBR Active Taxpayer", "real", fbr],
    ["AML / PEP / Sanctions", "simulated", aml],
    ["Account-title match", "simulated", accountTitle],
    ["Duplicate check", "real", duplicate],
    ["SECP", "simulated", secp],
  ];
  return defs.map(([name, mode, fn]) => {
    const r = fn(c, l);
    return { name, mode, ...r, passed: !FAIL_STATUSES.has(r.status) };
  });
}

const STP_PRODUCTS = new Set(["Raast QR", "Soundbox"]);
const ALWAYS_REVIEWED = new Set(["Android POS", "SoftPOS", "E-commerce gateway"]);

export type Routing = { straightThrough: boolean; riskBand: string; reason: string | null };

export function decideRouting(c: Pick<CaseRow, "tier" | "existing_customer" | "products">, checks: { passed: boolean; name: string; status: string }[]): Routing {
  const products = c.products || [];
  const failed = checks.filter((x) => !x.passed);
  if (failed.length > 0) return { straightThrough: false, riskBand: failed.length > 1 ? "High risk" : "Medium risk", reason: `${failed[0].name} did not pass (${failed[0].status}) — needs manual review.` };
  if (c.tier !== "Micro") return { straightThrough: false, riskBand: "Medium risk", reason: "Tier requires manual review before activation." };
  if (!c.existing_customer) return { straightThrough: false, riskBand: "Low risk", reason: "New-to-bank customer — straight-through rule only covers existing customers." };
  const reviewed = products.find((p) => ALWAYS_REVIEWED.has(p));
  if (reviewed) return { straightThrough: false, riskBand: "Medium risk", reason: `${reviewed} always routes to review — not a straight-through product.` };
  const nonStp = products.find((p) => !STP_PRODUCTS.has(p));
  if (nonStp) return { straightThrough: false, riskBand: "Medium risk", reason: `${nonStp} is not a straight-through product.` };
  if (products.length === 0) return { straightThrough: false, riskBand: "Low risk", reason: "No product selected yet." };
  return { straightThrough: true, riskBand: "Low risk", reason: null };
}

export const TRACKING_MESSAGES: Record<string, string> = {
  draft: "Your application hasn’t been submitted yet.",
  submitted: "We’ve received your application and are running checks.",
  queued: "Your application is under review.",
  approved: "Your account is active.",
  approved_limits: "Your account is active, with limits while we complete a few more checks.",
  activated: "Your account is active.",
  queried: "We need a bit more information from you — your branch or agent will be in touch.",
  declined: "We’re unable to proceed with this application right now.",
};
