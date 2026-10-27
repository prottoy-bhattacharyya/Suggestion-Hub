import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { PdfCard, StatusPill } from "@/components/PdfCard";
import { currentUserId, pdfs, users } from "@/lib/mock-data";

export const Route = createFileRoute("/profile/$id")({
  loader: ({ params }) => {
    const user = users.find((u) => u.id === params.id);
    if (!user) throw notFound();
    return { user };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.user.name ?? "Profile"} — Margin` },
      { name: "description", content: "Uploads, followers and following." },
      { property: "og:title", content: `${loaderData?.user.name ?? "Profile"} on Margin` },
      { property: "og:description", content: "Student profile and shared notes." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { user } = Route.useLoaderData();
  const me = user.id === currentUserId;
  const [follow, setFollow] = useState(false);
  const mine = pdfs.filter((p) => p.uploaderId === user.id && (me || p.status === "approved"));
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="paper-card flex flex-wrap items-center gap-6 p-6">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-primary font-display text-2xl text-primary-foreground">{user.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</div>
        <div className="flex-1">
          <h1 className="text-3xl">{user.name}</h1>
          <p className="text-sm text-muted-foreground">{user.department} · ID {user.studentId} · Intake {user.intake} · Section {user.section}</p>
          <p className="mt-1 text-sm">{user.courses.join(", ")}</p>
        </div>
        <div className="flex gap-6 text-center">
          <div><p className="font-display text-2xl">{mine.filter((p) => p.status === "approved").length}</p><p className="text-xs text-muted-foreground">Uploads</p></div>
          <div><p className="font-display text-2xl">{user.followers + (follow ? 1 : 0)}</p><p className="text-xs text-muted-foreground">Followers</p></div>
          <div><p className="font-display text-2xl">{user.following}</p><p className="text-xs text-muted-foreground">Following</p></div>
        </div>
        {!me && <button onClick={() => setFollow(!follow)} className={follow ? "btn-ghost" : "btn-primary"}>{follow ? "Following" : "Follow"}</button>}
      </div>
      <h2 className="mt-10 text-xl">{me ? "My uploads" : "Uploads"}</h2>
      <div className="mt-4 space-y-3">
        {mine.map((p) => (
          <div key={p.id}>
            {me && (
              <div className="mb-1 flex items-center gap-2">
                <StatusPill status={p.status} />
                {p.rejectReason && <span className="text-xs text-destructive">Reason: {p.rejectReason}</span>}
              </div>
            )}
            <PdfCard pdf={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
