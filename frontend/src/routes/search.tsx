import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { PdfCard } from "@/components/PdfCard";
import { pdfs } from "@/lib/mock-data";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search & Ask AI — Margin" },
      { name: "description", content: "Keyword, meaning-based search and an AI assistant over approved notes." },
      { property: "og:title", content: "Search & Ask AI — Margin" },
      { property: "og:description", content: "Find notes by meaning, not just title." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const [mode, setMode] = useState<"keyword" | "semantic" | "ai">("keyword");
  const [q, setQ] = useState("");
  const approved = pdfs.filter((p) => p.status === "approved");
  const results = q ? approved.filter((p) => mode === "semantic" || `${p.title} ${p.description} ${p.course}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.rating - a.rating) : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl">Search</h1>
      <div className="mt-5 inline-flex rounded-md border border-border bg-card p-1">
        {(["keyword", "semantic", "ai"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`rounded px-3 py-1.5 text-sm ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {m === "keyword" ? "Keyword" : m === "semantic" ? "By meaning" : "Ask AI"}
          </button>
        ))}
      </div>
      <input className="field mt-4 py-3 text-base" value={q} onChange={(e) => setQ(e.target.value)} placeholder={mode === "ai" ? "e.g. How does an LR rotation work?" : "Search titles, courses, descriptions…"} />

      {mode === "ai" && q && (
        <div className="paper-card mt-6 p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary"><Sparkles className="h-4 w-4" /> Answer from approved notes</div>
          <p className="mt-3 leading-relaxed">An LR rotation fixes a left-right imbalance: first rotate the left child to the left, then rotate the unbalanced node to the right. The result restores the AVL height property.</p>
          <div className="mt-4 text-xs text-muted-foreground">Sources: <Link to="/pdf/$id" params={{ id: "p1" }} className="text-primary underline">AVL Trees — p. 6</Link></div>
        </div>
      )}
      {mode !== "ai" && (
        <div className="mt-6 space-y-3">
          {results.map((p, i) => (
            <div key={p.id}>
              {mode === "semantic" && <p className="mb-1 text-xs text-muted-foreground">Best match on page {(i % 5) + 2}</p>}
              <PdfCard pdf={p} />
            </div>
          ))}
          {q && !results.length && <p className="py-10 text-center text-muted-foreground">No results. Try "By meaning".</p>}
        </div>
      )}
    </div>
  );
}
