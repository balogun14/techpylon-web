import Link from "next/link";
import { getCase, getAudit, type Case, type AuditEntry } from "@/lib/api";
import ReviewEditor from "./editor";

// Case review is live data; render it as a blocking dynamic route.
export const instant = false;

export default async function CasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let c: Case | null = null;
  let audit: AuditEntry[] = [];
  let error: string | null = null;
  try {
    [c, audit] = await Promise.all([getCase(id), getAudit(id)]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load case";
  }

  return (
    <main className="container">
      <header className="header">
        <p>
          <Link href="/">← Case queue</Link>
        </p>
        <h1>
          Case <code>{id}</code>
        </h1>
      </header>

      {error ? (
        <p className="error">{error}</p>
      ) : c ? (
        <ReviewEditor initialCase={c} initialAudit={audit} />
      ) : null}
    </main>
  );
}
