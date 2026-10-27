import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Search, Sparkles, Users } from "lucide-react";
import { PdfCard } from "@/components/PdfCard";
import { pdfs } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Margin — Teacher-verified notes & exam suggestions" },
      { name: "description", content: "Share and find course notes and exam suggestions, reviewed by your course teachers." },
      { property: "og:title", content: "Margin — Teacher-verified notes" },
      { property: "og:description", content: "Course notes and suggestions students can trust." },
    ],
  }),
  component: Index,
});

function Index() {
  const top = pdfs.filter((p) => p.status === "approved").slice(0, 3);
  return (
    <div>
      <section className="mx-auto grid max-w-6xl gap-12 px-4 py-20 md:grid-cols-2 md:items-center">
        <div>
          <span className="chip bg-highlight/25">For university students</span>
          <h1 className="mt-4 text-5xl leading-[1.05] md:text-6xl">Notes worth trusting, <em className="text-primary">checked by your teachers.</em></h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">Share notes and exam suggestions by course, intake and section. Search by meaning, or ask the AI — it only answers from approved material.</p>
          <div className="mt-8 flex gap-3">
            <Link to="/signup" className="btn-primary">Create account</Link>
            <Link to="/login" className="btn-ghost">Log in</Link>
          </div>
        </div>
        <div className="space-y-3 rotate-1">
          {top.map((p) => <PdfCard key={p.id} pdf={p} />)}
        </div>
      </section>
      <section className="border-t border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-4">
          {[
            [ShieldCheck, "Teacher reviewed", "Every PDF is approved by a course teacher before it goes live."],
            [Search, "Search by meaning", "Find the right page even when the title doesn't match."],
            [Sparkles, "AI from your notes", "Answers cite approved notes, never random web pages."],
            [Users, "Follow classmates", "New uploads from people you follow appear first."],
          ].map(([Icon, t, d]: any) => (
            <div key={t}>
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 text-lg">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
