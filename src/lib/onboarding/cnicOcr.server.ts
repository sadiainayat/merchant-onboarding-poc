// CNIC OCR via Amazon Bedrock Converse REST (bearer-token auth), with a
// fallback sample reading so the walkthrough never breaks.
const PROMPT_TEXT =
  "These are photos of a Pakistani CNIC — the first image given (if any) is the front, the second (if any) is the back. Read the fields and report what you see. If the address is not visible, leave it blank and mark confidence low.";

const EXTRACT_TOOL = {
  toolSpec: {
    name: "extract_cnic_fields",
    description: "Record the fields read off a Pakistani CNIC, front and/or back.",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          owner_name: { type: "string", description: "Full name as printed on the CNIC." },
          cnic_number: { type: "string", description: "CNIC number, formatted 00000-0000000-0." },
          cnic_dob: { type: "string", description: "Date of birth as printed, e.g. 14-Mar-1986." },
          cnic_father_name: { type: "string", description: "Father’s or husband’s name as printed." },
          cnic_address: { type: "string", description: "Address as printed on the back of the card, if legible." },
          cnic_address_confidence: { type: "string", enum: ["high", "low"] },
        },
        required: ["owner_name", "cnic_number", "cnic_dob", "cnic_father_name", "cnic_address_confidence"],
      },
    },
  },
};

export type CnicFields = {
  owner_name: string; cnic_number: string; cnic_dob: string; cnic_father_name: string;
  cnic_address: string; cnic_address_confidence: "high" | "low";
};

function parseDataUrl(v: string | null | undefined) {
  if (!v) return null;
  const m = /^data:image\/(\w+);base64,(.*)$/.exec(v);
  const format = (m ? m[1] : "jpeg") || "jpeg";
  return { format: format === "jpg" ? "jpeg" : format, base64: m ? m[2] : v };
}

function toFields(f: Record<string, unknown>): CnicFields {
  const s = (k: string) => (typeof f[k] === "string" ? (f[k] as string) : "");
  return {
    owner_name: s("owner_name"), cnic_number: s("cnic_number"), cnic_dob: s("cnic_dob"),
    cnic_father_name: s("cnic_father_name"), cnic_address: s("cnic_address"),
    cnic_address_confidence: f["cnic_address_confidence"] === "high" ? "high" : "low",
  };
}

type Block = { text?: string; toolUse?: { input?: Record<string, unknown> } };
function extract(output: { message?: { content?: Block[] } }) {
  const blocks = output?.message?.content || [];
  const tool = blocks.find((b) => b.toolUse);
  if (tool) return toFields(tool.toolUse!.input || {});
  const text = blocks.find((b) => b.text)?.text;
  const m = /\{[\s\S]*\}/.exec(text || "");
  if (!m) throw new Error("Model reply had no JSON to parse.");
  return toFields(JSON.parse(m[0]));
}

async function converse(content: unknown[], withTool: boolean) {
  const region = process.env["AWS_REGION"] || "ap-southeast-2";
  const model = process.env["BEDROCK_MODEL_ID"] || "qwen.qwen3-vl-235b-a22b";
  const token = process.env["AWS_BEARER_TOKEN_BEDROCK"] || process.env["BEDROCK_API_KEY"];
  if (!token) throw new Error("AWS_BEARER_TOKEN_BEDROCK is not set.");
  const body: Record<string, unknown> = { messages: [{ role: "user", content }] };
  if (withTool) body["toolConfig"] = { tools: [EXTRACT_TOOL], toolChoice: { tool: { name: "extract_cnic_fields" } } };
  const res = await fetch(`https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(model)}/converse`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Bedrock call failed (${res.status}): ${text.slice(0, 400)}`);
  return extract(JSON.parse(text).output);
}

const STUB: CnicFields = {
  owner_name: "Muhammad Imran Tariq", cnic_number: "35202-1234567-1", cnic_dob: "14-Mar-1986",
  cnic_father_name: "Ghulam Tariq", cnic_address: "House 12, Street 4, Samanabad, Lahore", cnic_address_confidence: "low",
};

export async function scanCnic(input: { frontBase64?: string | null; backBase64?: string | null }) {
  const front = parseDataUrl(input.frontBase64);
  const back = parseDataUrl(input.backBase64);
  if ((process.env["CNIC_OCR_MODE"] || "").toLowerCase() === "stub" || (!front && !back)) {
    return { ...STUB, _source: "stub" as const, _error: null as string | null };
  }
  const content: unknown[] = [{ text: PROMPT_TEXT }];
  if (front) content.push({ image: { format: front.format, source: { bytes: front.base64 } } });
  if (back) content.push({ image: { format: back.format, source: { bytes: back.base64 } } });
  try {
    let r: CnicFields;
    try {
      r = await converse(content, true);
    } catch {
      r = await converse([{ text: PROMPT_TEXT + ' Reply with ONLY a JSON object with these exact keys: owner_name, cnic_number, cnic_dob, cnic_father_name, cnic_address, cnic_address_confidence ("high" or "low"). No other text.' }, ...content.slice(1)], false);
    }
    return { ...r, _source: "bedrock" as const, _error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Bedrock CNIC extraction failed, falling back:", msg);
    return { ...STUB, _source: "stub-fallback" as const, _error: msg };
  }
}
