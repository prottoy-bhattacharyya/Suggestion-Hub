import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Eye } from "lucide-react";
import { pdfs, reviewLog, userById } from "@/lib/mock-data";

export const Route = createFileRoute("/teacher")({
  head: () => ({
    meta: [
      { title: "Review queue — Margin" },
      { name: "description", content: "Approve or reject pending PDFs for your courses." },
      { property: "og:title", content: "Review queue — Margin" },
      { property: "og:description", content: "Teacher review panel." },
    ],
  }),
  component: Teacher,
});

const me = "t1";

function Teacher() {
  const teacher = userById(me);
  const [queue, setQueue] = useState(pdfs.filter((p) => p.status === "pending" && teacher.courses.includes(p.course)));
  const [log, setLog] = useState(reviewLog);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const decide = (id: string, decision: string, comment: string) => {
    setQueue(queue.filter((p) => p.id !== id));
    setLog([{ pdfId: id, teacher: me, decision, comment, date: "2026-10-25" }, ...log]);
    setRejecting(null); setReason("");
  };
  const claim = (id: string) => setQueue(queue.map((p) => (p.id === id ? { ...p, claimedBy: me } : p)));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl">Review queue</h1>
      <p className="mt-1 text-sm text-muted-foreground">{teacher.name} · {teacher.courses.join(", ")} · {queue.length} waiting</p>
      <div className="mt-6 space-y-3">
        {queue.map((p) => {
          const mineClaim = p.claimedBy === me;
          return (
            <div key={p.id} className="paper-card p-5">
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex-1">
                  <div className="flex gap-2"><span className="chip bg-accent">{p.course}</span><span className="chip bg-secondary">{p.type}</span>{p.claimedBy && <span className="chip bg-highlight/25">{mineClaim ? "Claimed by you" : "Claimed"}</span>}</div>
                  <h3 className="mt-1 text-lg">{p.title}</h3>
                  <p className="text-sm text-muted-foreground">{userById(p.uploaderId).name} · Intake {p.intake} · Sec {p.section} · {p.pages} pages · {p.date}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to="/pdf/$id" params={{ id: p.id }} className="btn-ghost"><Eye className="h-4 w-4" /> Preview</Link>
                  <button className="btn-ghost"><Download className="h-4 w-4" /></button>
                  {!p.claimedBy && <button onClick={() => claim(p.id)} className="btn-ghost">Claim</button>}
                  {mineClaim && <>
                    <button onClick={() => decide(p.id, "approved", "Approved")} className="btn-primary">Approve</button>
                    <button onClick={() => setRejecting(p.id)} className="btn-ghost text-destructive">Reject</button>
                  </>}
                </div>
              </div>
              {rejecting === p.id && (
                <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); decide(p.id, "rejected", reason); }}>
                  <input className="field" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason the student will see" required />
                  <button className="btn-primary">Send</button>
                </form>
              )}
            </div>
          );
        })}
        {!queue.length && <p className="py-10 text-center text-muted-foreground">Queue is clear.</p>}
      </div>
      <h2 className="mt-12 text-xl">Review log</h2>
      <table className="mt-3 w-full text-left text-sm">
        <thead className="text-muted-foreground"><tr><th className="py-2">PDF</th><th>Decision</th><th>Comment</th><th>Date</th></tr></thead>
        <tbody>
          {log.map((l, i) => (
            <tr key={i} className="border-t border-border">
              <td className="py-2">{pdfs.find((p) => p.id === l.pdfId)?.title}</td>
              <td className={l.decision === "approved" ? "text-success" : "text-destructive"}>{l.decision}</td>
              <td>{l.comment}</td><td>{l.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
