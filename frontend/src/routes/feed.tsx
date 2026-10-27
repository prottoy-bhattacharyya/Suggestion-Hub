import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PdfCard } from "@/components/PdfCard";
import { currentUserId, pdfs, userById } from "@/lib/mock-data";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Your feed — Margin" },
      { name: "description", content: "Approved notes and suggestions for your courses." },
      { property: "og:title", content: "Your feed — Margin" },
      { property: "og:description", content: "Approved notes for your course and intake." },
    ],
  }),
  component: Feed,
});

const following = ["u2"];

function Feed() {
  const me = userById(currentUserId);
  const [f, setF] = useState({ course: "", intake: "", section: "", type: "", rating: "0" });
  const [shown, setShown] = useState(4);

  const list = useMemo(() => {
    const group = (p: (typeof pdfs)[0]) => {
      if (following.includes(p.uploaderId)) return 0;
      if (me.courses.includes(p.course)) return 1;
      if (userById(p.uploaderId).department === me.department) return 2;
      return 3;
    };
    return pdfs
      .filter((p) => p.status === "approved" && p.uploaderId !== me.id)
      .filter((p) => (!f.course || p.course === f.course) && (!f.intake || p.intake === f.intake) && (!f.section || p.section === f.section) && (!f.type || p.type === f.type) && p.rating >= +f.rating)
      .sort((a, b) => group(a) - group(b) || b.date.localeCompare(a.date));
  }, [f, me]);

  const sel = (k: keyof typeof f, opts: [string, string][]) => (
    <select className="field" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}>
      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[240px_1fr]">
      <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
        <h2 className="text-lg">Filters</h2>
        {sel("course", [["", "All courses"], ["CSE220", "CSE220"], ["CSE221", "CSE221"], ["EEE201", "EEE201"]])}
        {sel("intake", [["", "All intakes"], ["48", "Intake 48"], ["49", "Intake 49"]])}
        {sel("section", [["", "All sections"], ["1", "Section 1"], ["2", "Section 2"], ["3", "Section 3"], ["4", "Section 4"]])}
        {sel("type", [["", "Notes & suggestions"], ["note", "Notes"], ["suggestion", "Suggestions"]])}
        {sel("rating", [["0", "Any rating"], ["4", "4★ and up"], ["4.5", "4.5★ and up"]])}
      </aside>
      <main>
        <h1 className="text-3xl">Good evening, {me.name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-muted-foreground">People you follow first, then your courses, then your department.</p>
        <div className="mt-6 space-y-3">
          {list.slice(0, shown).map((p) => <PdfCard key={p.id} pdf={p} />)}
          {!list.length && <p className="py-10 text-center text-muted-foreground">No PDFs match these filters.</p>}
        </div>
        {shown < list.length && <button onClick={() => setShown(shown + 4)} className="btn-ghost mt-6 w-full">Load more</button>}
      </main>
    </div>
  );
}
