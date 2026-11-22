import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3, BookOpen, CheckCircle2, Clock, FileText, LoaderCircle,
  Star, TrendingUp, Upload, XCircle,
} from "lucide-react";

import api from "@/lib/api";
import { getSessionUser } from "@/lib/auth";

type AnalyticsNote = {
  id: number;
  title: string;
  course_code?: string;
  type: string;
  rating_avg: string | number;
  rating_count: number;
  created_at: string;
  review_status: "pending" | "approved" | "rejected";
};

type NotesResponse = { status: string; notes: AnalyticsNote[] };

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Suggestion Hub" },
      { name: "description", content: "See how your uploads are doing." },
      { property: "og:title", content: "Analytics — Suggestion Hub" },
      { property: "og:description", content: "Upload, review and rating insights." },
    ],
  }),
  beforeLoad: async () => {
    const user = await getSessionUser().catch(() => null);
    if (!user) throw redirect({ to: "/login" });
    return { user };
  },
  component: Analytics,
});

const num = (v: string | number) => Number(v) || 0;

function Analytics() {
  const { user } = Route.useRouteContext() as { user: { id: number; full_name: string } };
  const [notes, setNotes] = useState<AnalyticsNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<NotesResponse>("/notes/get_notes/", { params: { user_id: user.id } });
        if (cancelled) return;
        if (data.status === "success") setNotes(data.notes);
        else setError("Unable to load analytics.");
      } catch {
        if (!cancelled) setError("Unable to load analytics. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user.id]);

  const stats = useMemo(() => {
    const by = (s: AnalyticsNote["review_status"]) => notes.filter((n) => n.review_status === s).length;
    const rated = notes.filter((n) => n.rating_count > 0);
    const totalRatings = rated.reduce((a, n) => a + n.rating_count, 0);
    const avg = totalRatings ? rated.reduce((a, n) => a + num(n.rating_avg) * n.rating_count, 0) / totalRatings : 0;

    const months: { key: string; label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString("en", { month: "short" }), count: 0 });
    }
    notes.forEach((n) => {
      const d = new Date(n.created_at);
      const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (m) m.count++;
    });

    const courses = new Map<string, number>();
    notes.forEach((n) => { const c = n.course_code || "Other"; courses.set(c, (courses.get(c) ?? 0) + 1); });
    const topCourses = [...courses.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

    const types = new Map<string, number>();
    notes.forEach((n) => types.set(n.type, (types.get(n.type) ?? 0) + 1));

    const best = [...rated].sort((a, b) => num(b.rating_avg) - num(a.rating_avg) || b.rating_count - a.rating_count).slice(0, 5);

    return { approved: by("approved"), pending: by("pending"), rejected: by("rejected"), totalRatings, avg, months, topCourses, types: [...types.entries()], best };
  }, [notes]);

  const total = notes.length;
  const approvalRate = total ? Math.round((stats.approved / total) * 100) : 0;
  const maxMonth = Math.max(1, ...stats.months.map((m) => m.count));
  const maxCourse = Math.max(1, ...stats.topCourses.map((c) => c[1]));

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      <header className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 sm:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
          <BarChart3 size={14} /> Analytics
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">How your uploads are doing</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Reviews, ratings and activity for everything you've shared, {user.full_name.split(" ")[0]}.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
          <LoaderCircle className="animate-spin" size={20} /> Loading analytics…
        </div>
      ) : error ? (
        <p className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">{error}</p>
      ) : total === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-border p-14 text-center">
          <Upload className="mx-auto text-muted-foreground" size={32} />
          <h2 className="mt-4 text-lg font-semibold">No uploads yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Share your first note to start seeing analytics.</p>
          <Link to="/upload" className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">Upload a file</Link>
        </div>
      ) : (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi icon={<FileText size={18} />} label="Total uploads" value={total} hint={`${stats.months.at(-1)?.count ?? 0} this month`} />
            <Kpi icon={<CheckCircle2 size={18} />} label="Approval rate" value={`${approvalRate}%`} hint={`${stats.approved} approved`} />
            <Kpi icon={<Star size={18} />} label="Average rating" value={stats.avg ? stats.avg.toFixed(1) : "—"} hint={`${stats.totalRatings} ratings`} />
            <Kpi icon={<Clock size={18} />} label="Waiting review" value={stats.pending} hint={`${stats.rejected} rejected`} />
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card title="Uploads over 6 months" icon={<TrendingUp size={16} />} className="lg:col-span-2">
              <div className="flex h-52 items-end gap-3">
                {stats.months.map((m) => (
                  <div key={m.key} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-xs font-medium tabular-nums">{m.count}</span>
                    <div className="w-full rounded-t-xl bg-primary/80 transition-all" style={{ height: `${(m.count / maxMonth) * 100}%`, minHeight: 4 }} />
                    <span className="text-xs text-muted-foreground">{m.label}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Review status" icon={<CheckCircle2 size={16} />}>
              <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                <div className="bg-primary" style={{ width: `${(stats.approved / total) * 100}%` }} />
                <div className="bg-muted-foreground/50" style={{ width: `${(stats.pending / total) * 100}%` }} />
                <div className="bg-destructive" style={{ width: `${(stats.rejected / total) * 100}%` }} />
              </div>
              <ul className="mt-5 space-y-3 text-sm">
                <Row icon={<CheckCircle2 size={15} className="text-primary" />} label="Approved" value={stats.approved} />
                <Row icon={<Clock size={15} className="text-muted-foreground" />} label="Pending" value={stats.pending} />
                <Row icon={<XCircle size={15} className="text-destructive" />} label="Rejected" value={stats.rejected} />
              </ul>
              <div className="mt-6 border-t border-border pt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">By type</p>
                <div className="flex flex-wrap gap-2">
                  {stats.types.map(([t, c]) => (
                    <span key={t} className="rounded-full border border-border px-3 py-1 text-xs capitalize">{t} · {c}</span>
                  ))}
                </div>
              </div>
            </Card>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card title="Top courses" icon={<BookOpen size={16} />}>
              <ul className="space-y-4">
                {stats.topCourses.map(([c, n]) => (
                  <li key={c}>
                    <div className="mb-1.5 flex justify-between text-sm"><span className="font-medium">{c}</span><span className="tabular-nums text-muted-foreground">{n}</span></div>
                    <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${(n / maxCourse) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Best rated uploads" icon={<Star size={16} />}>
              {stats.best.length === 0 ? (
                <p className="text-sm text-muted-foreground">No ratings yet.</p>
              ) : (
                <ol className="divide-y divide-border">
                  {stats.best.map((n, i) => (
                    <li key={n.id}>
                      <Link to="/notes/$id" params={{ id: String(n.id) }} className="flex items-center gap-3 py-3 hover:opacity-80">
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-muted text-xs font-semibold">{i + 1}</span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{n.title}</span>
                        <span className="flex items-center gap-1 text-sm tabular-nums"><Star size={14} className="fill-current" />{num(n.rating_avg).toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground">({n.rating_count})</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </section>
        </>
      )}
    </main>
  );
}

function Kpi({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: React.ReactNode; hint: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="grid h-8 w-8 place-items-center rounded-xl bg-muted text-foreground">{icon}</span>{label}</div>
      <p className="mt-4 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function Card({ title, icon, children, className = "" }: { title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-border bg-card p-6 ${className}`}>
      <h2 className="mb-5 flex items-center gap-2 text-sm font-semibold">{icon}{title}</h2>
      {children}
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <li className="flex items-center justify-between"><span className="flex items-center gap-2">{icon}{label}</span><span className="font-medium tabular-nums">{value}</span></li>;
}