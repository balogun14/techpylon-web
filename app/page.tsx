import Link from "next/link";
import { listCases, type Case } from "@/lib/api";
import Upload from "./upload";

// Queue is live data; render it as a blocking dynamic route.
export const instant = false;

function shortId(id: string) {
  return id.length > 12 ? `${id.slice(0, 12)}…` : id;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function StatusBadge({ status }: { status: Case["status"] }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

export default async function Home() {
  let cases: Case[] = [];
  let error: string | null = null;
  try {
    cases = await listCases();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load cases";
  }

  return (
    <main className="container">
      <header className="header">
        <h1>TechPylon — Reviewer Gate</h1>
        <p className="muted">Clinical AI case extraction review</p>
      </header>

      <Upload />

      <section className="card">
        <h2>Case queue</h2>
        {error ? (
          <p className="error">{error}</p>
        ) : cases.length === 0 ? (
          <p className="muted">No cases yet. Upload a report to get started.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Filename</th>
                <th>Doc type</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id}>
                  <td>
                    <code>{shortId(c.id)}</code>
                  </td>
                  <td>{c.source.filename}</td>
                  <td>{c.source.doc_type}</td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td>{fmtDate(c.created_at)}</td>
                  <td>
                    <Link href={`/cases/${c.id}`}>Review →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
