import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Flag, Star } from "lucide-react";
import { Stars, StatusPill } from "@/components/PdfCard";
import { currentUserId, pdfById, userById } from "@/lib/mock-data";

export const Route = createFileRoute("/pdf/$id")({
  loader: ({ params }) => {
    const pdf = pdfById(params.id);
    if (!pdf) throw notFound();
    return { pdf };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.pdf.title ?? "PDF"} — Margin` },
      { name: "description", content: loaderData?.pdf.description ?? "Course PDF" },
      { property: "og:title", content: loaderData?.pdf.title ?? "PDF" },
      { property: "og:description", content: loaderData?.pdf.description ?? "Course PDF" },
    ],
  }),
  component: PdfPage,
});

function PdfPage() {
  const { pdf } = Route.useLoaderData();
  const u = userById(pdf.uploaderId);
  const own = pdf.uploaderId === currentUserId;
  const [mine, setMine] = useState(0);
  const [hover, setHover] = useState(0);
  const [report, setReport] = useState(false);
  const [sent, setSent] = useState(false);

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_320px]">
      <div className="paper-card grid aspect-[3/4] place-items-center bg-muted p-8 text-center text-muted-foreground">
        <div><p className="font-display text-2xl text-foreground">{pdf.title}</p><p className="mt-2 text-sm">PDF preview · {pdf.pages} pages</p></div>
      </div>
      <aside className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <span className="chip bg-accent">{pdf.course}</span><span className="chip bg-secondary">{pdf.type}</span>
          {pdf.status !== "approved" && <StatusPill status={pdf.status} />}
        </div>
        <h1 className="text-2xl leading-tight">{pdf.title}</h1>
        <p className="text-sm text-muted-foreground">{pdf.description}</p>
        <p className="text-sm">Intake {pdf.intake} · Section {pdf.section} · {pdf.date}</p>
        <Link to="/profile/$id" params={{ id: u.id }} className="block text-sm">by <b className="text-primary">{u.name}</b></Link>
        <div className="flex items-center gap-2"><Stars value={pdf.rating} /> <span className="text-sm text-muted-foreground">{pdf.ratingCount} ratings</span></div>
        <button className="btn-primary w-full"><Download className="h-4 w-4" /> Download</button>

        {pdf.status === "approved" && (
          <div className="paper-card p-4">
            <p className="label-sm">{own ? "You can't rate your own upload" : mine ? "Your rating" : "Rate this PDF"}</p>
            <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} disabled={own} onMouseEnter={() => setHover(n)} onClick={() => setMine(n)} aria-label={`${n} stars`}>
                  <Star className={`h-6 w-6 ${(hover || mine) >= n ? "fill-highlight text-highlight" : "text-border"}`} />
                </button>
              ))}
            </div>
          </div>
        )}

        {!sent ? (
          report ? (
            <form className="paper-card space-y-3 p-4" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
              <select className="field"><option>Wrong content</option><option>Copyright</option><option>Inappropriate</option></select>
              <textarea className="field" rows={3} placeholder="Details" />
              <button className="btn-primary w-full">Send report</button>
            </form>
          ) : (
            <button onClick={() => setReport(true)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive"><Flag className="h-4 w-4" /> Report this PDF</button>
          )
        ) : <p className="text-sm text-success">Report sent to admins.</p>}
      </aside>
    </div>
  );
}
