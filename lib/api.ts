export type Origin = "deterministic" | "heuristic" | "reviewer";

export type SourceSpan = {
  start: number;
  end: number;
  quote: string;
};

export type FieldDraft = {
  value: string;
  confidence: number;
  source_span: SourceSpan | null;
  origin: Origin;
  needs_review: boolean;
  edited: boolean;
};

export const FIELD_KEYS = [
  "patient",
  "product",
  "event",
  "reporter",
  "seriousness",
  "expectedness",
] as const;

export type FieldKey = (typeof FIELD_KEYS)[number];

export const FIELD_LABELS: Record<FieldKey | "narrative", string> = {
  patient: "Patient",
  product: "Product",
  event: "Event",
  reporter: "Reporter",
  seriousness: "Seriousness",
  expectedness: "Expectedness",
  narrative: "Narrative",
};

export type Case = {
  id: string;
  status: "draft" | "released";
  extractor_version: string;
  source: { filename: string; doc_type: "csv_line_listing" | "free_text" };
  fields: Record<FieldKey, FieldDraft>;
  narrative: FieldDraft;
  created_at: string;
  released_at: string | null;
};

export type AuditEntry = {
  id: number;
  case_id: string;
  actor: string;
  action: "field_update" | "release" | "create";
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  reason: string | null;
  ts: string;
};

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { cache: "no-store", ...init });
  } catch {
    throw new ApiError(0, `API unreachable at ${API_BASE}`);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, `API ${res.status}: ${body || res.statusText}`);
  }
  return (await res.json()) as T;
}

export async function listCases(): Promise<Case[]> {
  const data = await request<{ cases: Case[] }>("/api/cases");
  return data.cases;
}

export async function getCase(id: string): Promise<Case> {
  return request<Case>(`/api/cases/${encodeURIComponent(id)}`);
}

export async function updateFields(
  id: string,
  actor: string,
  reason: string,
  fieldValues: Record<string, { value: string }>,
): Promise<Case> {
  return request<Case>(`/api/cases/${encodeURIComponent(id)}/fields`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actor, reason, fields: fieldValues }),
  });
}

export async function releaseCase(id: string, actor: string): Promise<Case> {
  return request<Case>(`/api/cases/${encodeURIComponent(id)}/release`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actor }),
  });
}

export async function getAudit(id: string): Promise<AuditEntry[]> {
  const data = await request<{ audit: AuditEntry[] }>(
    `/api/cases/${encodeURIComponent(id)}/audit`,
  );
  return data.audit;
}

export function e2bExportUrl(id: string): string {
  return `${API_BASE}/api/cases/${encodeURIComponent(id)}/export/e2b`;
}
