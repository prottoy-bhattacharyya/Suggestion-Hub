import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { PdfCard, StatusPill } from "@/components/PdfCard";
import { pdfs } from "@/lib/mock-data";
import api from "@/lib/api";
import { getSessionUser } from "@/lib/auth";

type ProfileData = {
  user: {
    id: number;
    email?: string;
    full_name: string;
    role: string;
    student_id: string | null;
    department_name: string | null;
    intake: string | null;
    section: string | null;
  };
  followers: number;
  following: number;
  courses: string[];
  is_owner: boolean;
};

export const Route = createFileRoute("/profile/$id")({
  head: () => ({
    meta: [
      { title: "Profile — Suggesion Hub" },
      { name: "description", content: "Uploads, followers and following." },
    ],
  }),
  loader: async ({ params }) => {
    // "me" resolves to the logged-in session user; anything else is an id
    // ("1" — real links, or legacy mock links like "u1" — both strip to 1).
    let serverId: number;

    if (params.id.toLowerCase() === "me") {
      const sessionUser = await getSessionUser();

      if (!sessionUser) {
        throw redirect({ to: "/login" });
      }

      serverId = sessionUser.id;
    } else {
      serverId = Number.parseInt(params.id.replace(/\D/g, ""), 10);
    }

    if (!Number.isFinite(serverId)) {
      throw notFound();
    }

    try {
      const { data } = await api.get<ProfileData>(
        `/accounts/profile/${serverId}/`,
      );
      return { profile: data };
    } catch {
      throw notFound();
    }
  },
  component: Profile,
});

function Profile() {
  const { profile } = Route.useLoaderData();
  const user = profile.user;

  const isMe = profile.is_owner;
  const [follow, setFollow] = useState(false);

  // Mock uploads stay keyed to the legacy ids ("u" + numeric id) until the
  // notes endpoints are wired to the backend.
  const legacyId = `u${user.id}`;
  const mine = pdfs.filter(
    (p) => p.uploaderId === legacyId && (isMe || p.status === "approved"),
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="paper-card flex flex-wrap items-center gap-6 p-6">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-primary font-display text-2xl text-primary-foreground">
          {user.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
        </div>

        <div className="flex-1">
          <h1 className="text-3xl">{user.full_name}</h1>
          <p className="text-sm text-muted-foreground">
            {user.department_name ?? "—"} · ID {user.student_id ?? "—"} ·
            Intake {user.intake ?? "—"} · Section {user.section ?? "—"}
          </p>

          {profile.courses.length > 0 && (
            <p className="mt-1 text-sm">{profile.courses.join(", ")}</p>
          )}
        </div>

        <div className="flex gap-6 text-center">
          <div>
            <p className="font-display text-2xl">
              {mine.filter((p) => p.status === "approved").length}
            </p>
            <p className="text-xs text-muted-foreground">Uploads</p>
          </div>

          <div>
            <p className="font-display text-2xl">
              {profile.followers + (follow ? 1 : 0)}
            </p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </div>

          <div>
            <p className="font-display text-2xl">{profile.following}</p>
            <p className="text-xs text-muted-foreground">Following</p>
          </div>
        </div>

        {!isMe && (
          <button
            onClick={() => setFollow((previous) => !previous)}
            className={follow ? "btn-ghost" : "btn-primary"}
          >
            {follow ? "Following" : "Follow"}
          </button>
        )}
      </div>

      <h2 className="mt-10 text-xl">{isMe ? "My uploads" : "Uploads"}</h2>

      <div className="mt-4 space-y-3">
        {mine.map((p) => (
          <div key={p.id}>
            {isMe && (
              <div className="mb-1 flex items-center gap-2">
                <StatusPill status={p.status} />
                {p.rejectReason && (
                  <span className="text-xs text-destructive">
                    Reason: {p.rejectReason}
                  </span>
                )}
              </div>
            )}
            <PdfCard pdf={p} />
          </div>
        ))}

        {!mine.length && (
          <p className="py-10 text-center text-muted-foreground">
            No uploads yet.
          </p>
        )}
      </div>

      <Link to="/feeds" className="btn-ghost mt-8 inline-block">
        Back to feed
      </Link>
    </div>
  );
}
