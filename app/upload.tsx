"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE, ApiError, type Case } from "@/lib/api";

export default function Upload() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitFile() {
    const file = fileRef.current?.files?.[0];
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_BASE}/api/cases`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new ApiError(res.status, await res.text());
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitText() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          filename: `pasted_${Date.now()}.txt`,
        }),
      });
      if (!res.ok) throw new ApiError(res.status, await res.text());
      setText("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card upload">
      <h2>New case</h2>
      <div className="upload-row">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt"
          aria-label="Upload file"
        />
        <button onClick={submitFile} disabled={busy}>
          Upload file
        </button>
      </div>
      <div className="upload-row">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="…or paste report text here"
          rows={3}
        />
        <button onClick={submitText} disabled={busy || !text.trim()}>
          Paste as case
        </button>
      </div>
      {busy && <p className="muted">Uploading…</p>}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
