"use client";

import { useState } from "react";
import {
  FIELD_KEYS,
  FIELD_LABELS,
  e2bExportUrl,
  getAudit,
  releaseCase,
  updateFields,
  type AuditEntry,
  type Case,
  type FieldDraft,
  type FieldKey,
} from "@/lib/api";

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  const low = value < 0.6;
  return (
    <span className="conf" title={`confidence ${value}`}>
      <span className={`conf-bar${low ? " conf-low" : ""}`}>
        <span style={{ width: `${pct}%` }} />
      </span>
      <span className="conf-num">{pct}%</span>
    </span>
  );
}

function FieldRow({
  label,
  field,
  f,
  draft,
  disabled,
  onChange,
}: {
  label: string;
  field: FieldKey | "narrative";
  f: FieldDraft;
  draft: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className={`field-row${f.needs_review ? " field-flagged" : ""}`}>
      <div className="field-head">
        <label htmlFor={`f-${field}`}>{label}</label>
        <span className="field-meta">
          <span className={`tag tag-${f.origin}`}>{f.origin}</span>
          {f.edited && <span className="tag tag-edited">edited</span>}
          {f.needs_review && <span className="badge badge-review">needs review</span>}
        </span>
      </div>
      <input
        id={`f-${field}`}
        value={draft}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      {f.source_span && (
        <blockquote className="span-quote">“{f.source_span.quote}”</blockquote>
      )}
      <ConfidenceBar value={f.confidence} />
    </div>
  );
}

export default function ReviewEditor({
  initialCase,
  initialAudit,
}: {
  initialCase: Case;
  initialAudit: AuditEntry[];
}) {
  const [c, setC] = useState(initialCase);
  const [audit, setAudit] = useState(initialAudit);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const d: Record<string, string> = {};
    for (const k of FIELD_KEYS) d[k] = initialCase.fields[k]?.value ?? "";
    d.narrative = initialCase.narrative?.value ?? "";
    return d;
  });
  const [actor, setActor] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const released = c.status === "released";
  const inputsDisabled = released || busy;

  function setDraft(key: string, value: string) {
    setDrafts((d) => ({ ...d, [key]: value }));
  }

  async function save() {
    if (!actor.trim() || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const fields: Record<string, { value: string }> = {};
      for (const k of FIELD_KEYS) {
        if (drafts[k] !== (c.fields[k]?.value ?? "")) {
          fields[k] = { value: drafts[k] };
        }
      }
      if (drafts.narrative !== (c.narrative?.value ?? "")) {
        fields.narrative = { value: drafts.narrative };
      }
      const updated = await updateFields(c.id, actor, reason, fields);
      setC(updated);
      setReason("");
      setNotice(Object.keys(fields).length
        ? "Changes saved."
        : "Nothing changed — saved state refreshed.");
      setAudit(await getAudit(updated.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function release() {
    if (busy) return;
    if (!confirm(`Release case ${c.id}? Released cases become read-only.`)) return;
    if (!actor.trim()) {
      setError("Enter an actor name before releasing.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await releaseCase(c.id, actor);
      setC(updated);
      setNotice("Case released.");
      setAudit(await getAudit(updated.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Release failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="card">
        <div className="case-meta">
          <span className={`badge badge-${c.status}`}>{c.status}</span>
          <span className="muted">
            {c.source.filename} · {c.source.doc_type} · extractor v
            {c.extractor_version} · created {new Date(c.created_at).toLocaleString()}
            {c.released_at &&
              ` · released ${new Date(c.released_at).toLocaleString()}`}
          </span>
        </div>

        {FIELD_KEYS.map((k) => (
          <FieldRow
            key={k}
            label={FIELD_LABELS[k]}
            field={k}
            f={c.fields[k] ?? {
              value: "",
              confidence: 0,
              source_span: null,
              origin: "deterministic",
              needs_review: false,
              edited: false,
            }}
            draft={drafts[k]}
            disabled={inputsDisabled}
            onChange={(v) => setDraft(k, v)}
          />
        ))}

        <FieldRow
          label="Narrative"
          field="narrative"
          f={c.narrative ?? {
            value: "",
            confidence: 0,
            source_span: null,
            origin: "deterministic",
            needs_review: false,
            edited: false,
          }}
          draft={drafts.narrative}
          disabled={inputsDisabled}
          onChange={(v) => setDraft("narrative", v)}
        />

        {released ? (
          <p className="notice">
            This case is released and read-only.{" "}
            <a href={e2bExportUrl(c.id)}>Download E2B(R3) export</a>
          </p>
        ) : (
          <div className="save-bar">
            <div className="save-inputs">
              <input
                value={actor}
                onChange={(e) => setActor(e.target.value)}
                placeholder="Actor (your name)"
                aria-label="Actor"
              />
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for changes"
                aria-label="Reason"
              />
            </div>
            <div className="save-actions">
              <button onClick={save} disabled={busy || !actor.trim()}>
                Save changes
              </button>
              <button
                className="btn-release"
                onClick={release}
                disabled={busy || !actor.trim()}
              >
                Release case
              </button>
            </div>
          </div>
        )}

        {busy && <p className="muted">Working…</p>}
        {error && <p className="error">{error}</p>}
        {notice && <p className="notice">{notice}</p>}
      </section>

      <section className="card">
        <h2>Audit trail</h2>
        {audit.length === 0 ? (
          <p className="muted">No audit entries.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Field</th>
                <th>Old → New</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((a) => (
                <tr key={a.id}>
                  <td>{new Date(a.ts).toLocaleString()}</td>
                  <td>{a.actor}</td>
                  <td>{a.action}</td>
                  <td>{a.field ?? "—"}</td>
                  <td>
                    {a.old_value == null && a.new_value == null
                      ? "—"
                      : `${a.old_value ?? "(empty)"} → ${a.new_value ?? "(empty)"}`}
                  </td>
                  <td>{a.reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
