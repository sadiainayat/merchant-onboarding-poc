import { describe, expect, it } from "vitest";
import { decideRouting, runAllChecks, type CaseRow } from "@/lib/onboarding/rules";
import { similarity } from "@/lib/onboarding/nameMatch";

const base = { id: "x", tier: "Micro", existing_customer: true, products: ["Raast QR"], cnic_number: "35202-1234567-1",
  owner_name: "Muhammad Imran Tariq", declared_name: "Imran Tariq", name_match_score: 1, name_override: false, business_name: "Imran Store" } as unknown as CaseRow;
const lookups = { atl: { active: true, snapshot_date: "2026-10-26" }, duplicateRef: null };

describe("onboarding rules", () => {
  it("partial name scores as a match", () => expect(similarity("Imran Tariq", "Muhammad Imran Tariq")).toBeGreaterThanOrEqual(0.6));
  it("micro existing QR with all checks passed goes straight through", () =>
    expect(decideRouting(base, runAllChecks(base, lookups)).straightThrough).toBe(true));
  it("Chaudhry business name is an AML hit", () =>
    expect(runAllChecks({ ...base, business_name: "Chaudhry Fabrics" }, lookups).find((c) => c.name === "AML / PEP / Sanctions")!.passed).toBe(false));
  it("name override still routes to review", () =>
    expect(decideRouting(base, runAllChecks({ ...base, name_override: true, name_match_score: 0.2 }, lookups)).straightThrough).toBe(false));
  it("Android POS always reviewed", () => expect(decideRouting({ ...base, products: ["Android POS"] }, []).straightThrough).toBe(false));
  it("new-to-bank is reviewed", () => expect(decideRouting({ ...base, existing_customer: false }, []).straightThrough).toBe(false));
});
