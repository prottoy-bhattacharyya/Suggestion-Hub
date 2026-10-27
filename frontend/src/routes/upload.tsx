import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, UploadCloud } from "lucide-react";
import { courses } from "@/lib/mock-data";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload a PDF — Margin" },
      { name: "description", content: "Share a note or exam suggestion for teacher review." },
      { property: "og:title", content: "Upload a PDF — Margin" },
      { property: "og:description", content: "Submit notes for teacher review." },
    ],
  }),
  component: Upload,
});

const checks = ["File is a valid PDF under 20 MB", "Not encrypted or corrupted", "Page count within limit (≤ 60)", "Scanned pages detected → OCR queued", "Not a duplicate (file hash)"];

function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [done, setDone] = useState(false);
  if (done)
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
        <h1 className="mt-4 text-3xl">Sent for review</h1>
        <p className="mt-2 text-muted-foreground">Status: <b>Pending review</b>. Only you can see it until a course teacher approves it.</p>
        <Link to="/profile/$id" params={{ id: "u1" }} className="btn-primary mt-6">View my uploads</Link>
      </div>
    );
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl">Upload a PDF</h1>
      <form className="mt-6 grid gap-6 md:grid-cols-[1fr_260px]" onSubmit={(e) => { e.preventDefault(); setDone(true); }}>
        <div className="paper-card grid gap-4 p-6 sm:grid-cols-2">
          <label className="grid cursor-pointer place-items-center gap-2 rounded-md border-2 border-dashed border-border p-8 text-center sm:col-span-2 hover:bg-secondary">
            <UploadCloud className="h-8 w-8 text-primary" />
            <span className="text-sm">{file ? file.name : "Choose a PDF file"}</span>
            <input type="file" accept="application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
          </label>
          <div className="sm:col-span-2"><label className="label-sm">Title</label><input className="field" required /></div>
          <div><label className="label-sm">Course code</label><select className="field">{courses.map((c) => <option key={c.code}>{c.code}</option>)}</select></div>
          <div><label className="label-sm">Type</label><select className="field"><option value="note">Note</option><option value="suggestion">Suggestion</option></select></div>
          <div><label className="label-sm">Intake</label><input className="field" defaultValue="49" /></div>
          <div><label className="label-sm">Section</label><input className="field" defaultValue="3" /></div>
          <div className="sm:col-span-2"><label className="label-sm">Description (optional)</label><textarea className="field" rows={3} /></div>
          <button className="btn-primary sm:col-span-2">Submit for review</button>
        </div>
        <aside className="paper-card h-fit p-5">
          <h3 className="text-base">Automatic checks</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {checks.map((c) => (
              <li key={c} className="flex gap-2"><CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${file ? "text-success" : "text-muted-foreground"}`} />{c}</li>
            ))}
          </ul>
        </aside>
      </form>
    </div>
  );
}
