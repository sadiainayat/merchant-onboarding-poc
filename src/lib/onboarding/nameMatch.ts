// Simple, explainable fuzzy name matching (ported from the original POC).
function normalize(name: string | null | undefined) {
  return (name || "").toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
}

function levenshtein(a: string, b: string) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const row = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) row[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = row[j]!;
      row[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, row[j]!, row[j - 1]!);
      prev = temp;
    }
  }
  return row[n]!;
}

function levenshteinRatio(a: string, b: string) {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

function tokenOverlapRatio(a: string, b: string) {
  const ta = new Set(a.split(" ").filter(Boolean));
  const tb = new Set(b.split(" ").filter(Boolean));
  if (ta.size === 0 && tb.size === 0) return 1;
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared += 1;
  return shared / Math.min(ta.size, tb.size);
}

export const MATCH_THRESHOLD = 0.6;

export function similarity(nameA: string | null | undefined, nameB: string | null | undefined) {
  const a = normalize(nameA);
  const b = normalize(nameB);
  if (!a || !b) return null;
  return Math.max(levenshteinRatio(a, b), tokenOverlapRatio(a, b));
}
