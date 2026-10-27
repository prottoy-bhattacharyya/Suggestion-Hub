import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { courses, pdfs, reports, userById, users } from "@/lib/mock-data";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Margin" },
      { name: "description", content: "Manage users, courses, teachers and reports." },
      { property: "og:title", content: "Admin — Margin" },
      { property: "og:description", content: "Admin moderation panel." },
    ],
  }),
  component: Admin,
});

const tabs = ["Reports", "Users", "Courses"] as const;

function Admin() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Reports");
  const [open, setOpen] = useState(reports);
  const [blocked, setBlocked] = useState<string[]>([]);
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl">Admin</h1>
      <div className="mt-5 flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`-mb-px border-b-2 px-4 py-2 text-sm ${tab === t ? "border-primary font-semibold" : "border-transparent text-muted-foreground"}`}>{t}</button>
        ))}
      </div>

      {tab === "Reports" && (
        <div className="mt-6 space-y-3">
          {open.map((r) => {
            const p = pdfs.find((x) => x.id === r.pdfId)!;
            return (
              <div key={r.id} className="paper-card p-5">
                <span className="chip bg-destructive/15 text-destructive">{r.reason}</span>
                <h3 className="mt-1 text-lg">{p.title}</h3>
                <p className="text-sm text-muted-foreground">"{r.detail}" — {userById(r.reporter).name}, {r.date}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => setOpen(open.filter((x) => x.id !== r.id))} className="btn-primary">Remove PDF</button>
                  <button onClick={() => setOpen(open.filter((x) => x.id !== r.id))} className="btn-ghost">Warn uploader</button>
                  <button onClick={() => { setBlocked([...blocked, p.uploaderId]); setOpen(open.filter((x) => x.id !== r.id)); }} className="btn-ghost text-destructive">Block account</button>
                  <button onClick={() => setOpen(open.filter((x) => x.id !== r.id))} className="btn-ghost">Dismiss</button>
                </div>
              </div>
            );
          })}
          {!open.length && <p className="py-10 text-center text-muted-foreground">No open reports.</p>}
        </div>
      )}

      {tab === "Users" && (
        <table className="mt-6 w-full text-left text-sm">
          <thead className="text-muted-foreground"><tr><th className="py-2">Name</th><th>Role</th><th>Dept</th><th>Status</th><th /></tr></thead>
          <tbody>
            {users.map((u) => {
              const b = blocked.includes(u.id);
              return (
                <tr key={u.id} className="border-t border-border">
                  <td className="py-2">{u.name}</td><td className="capitalize">{u.role}</td><td>{u.department}</td>
                  <td className={b ? "text-destructive" : "text-success"}>{b ? "Blocked" : "Active"}</td>
                  <td className="text-right"><button onClick={() => setBlocked(b ? blocked.filter((x) => x !== u.id) : [...blocked, u.id])} className="btn-ghost py-1">{b ? "Unblock" : "Block"}</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {tab === "Courses" && (
        <div className="mt-6 space-y-3">
          {courses.map((c) => (
            <div key={c.code} className="paper-card flex flex-wrap items-center gap-4 p-4">
              <div className="flex-1"><p className="font-semibold">{c.code} · {c.name}</p><p className="text-sm text-muted-foreground">Teachers: {c.teachers.map((t) => userById(t).name).join(", ") || "none assigned"}</p></div>
              <select className="field w-56"><option>Assign teacher…</option>{users.filter((u) => u.role === "teacher").map((t) => <option key={t.id}>{t.name}</option>)}</select>
            </div>
          ))}
          <button className="btn-ghost">+ Add course</button>
        </div>
      )}
    </div>
  );
}
