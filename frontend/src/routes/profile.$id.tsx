import {
  createFileRoute,
  Link,
  notFound,
  redirect,
} from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Star,
  ExternalLink,
  LoaderCircle,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  GraduationCap,
  Hash,
  Briefcase,
  UserPlus,
  UserCheck,
  CalendarDays,
  Inbox,
} from "lucide-react";

import api from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { getCSRFToken } from "@/lib/utils";

type ProfileData = {
  user: {
    id: number;
    email?: string;
    full_name: string;
    role: string;
    student_id?: string | null;
    department_id?: number | null;
    department_name?: string | null;
    intake?: string | null;
    section?: string | null;
    designation?: string | null;
    employee_id?: string | null;
  };
  followers: number;
  following: number;
  courses: string[];
  is_owner: boolean;
};

type FollowStatusResponse = {
  status: string;
  is_following: boolean;
};

type Note = {
  id: number;
  title: string;
  description: string;
  type: "note" | "suggestion";
  intake: string;
  section: string;
  rating_avg: string;
  rating_count: number;
  created_at: string;
  review_status: "pending" | "approved" | "rejected";
  rejection_reason?: string | null;
  review_reason?: string | null;
  uploader_name: string;
  file_url?: string | null;
};

type NotesResponse = {
  status: string;
  notes: Note[];
};

export const Route = createFileRoute("/profile/$id")({
  head: () => ({
    meta: [
      { title: "Profile — Suggestion Hub" },
      {
        name: "description",
        content: "Uploads, followers and following.",
      },
    ],
  }),

  loader: async ({ params }) => {
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

    if (!Number.isFinite(serverId) || serverId <= 0) {
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

  const role = user.role?.toLowerCase() ?? "";
  const isTeacher =
    role.includes("teacher") || role.includes("faculty");

  const [follow, setFollow] = useState(false);
  const [followersCount, setFollowersCount] = useState(profile.followers);
  const [followLoading, setFollowLoading] = useState(false);
  const [followChecking, setFollowChecking] = useState(!isMe);
  const [followError, setFollowError] = useState("");

  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState("");
  const [tab, setTab] = useState<"approved" | "pending" | "rejected">("approved");

  // Fetch notes belonging to this profile.
  useEffect(() => {
    let cancelled = false;

    async function fetchNotes() {
      setNotesLoading(true);
      setNotesError("");

      try {
        const { data } = await api.get<NotesResponse>(
          "/notes/get_notes/",
          {
            params: {
              user_id: user.id,
            },
          },
        );

        if (!cancelled) {
          if (data.status === "success") {
            // Owners can see all their uploads.
            // Visitors can only see approved uploads.
            const visibleNotes = isMe
              ? data.notes
              : data.notes.filter(
                  (note) => note.review_status === "approved",
                );

            setNotes(visibleNotes);
          } else {
            setNotesError("Unable to load uploads.");
          }
        }
      } catch (error) {
        console.error("Notes loading failed:", error);

        if (!cancelled) {
          setNotesError("Unable to load uploads. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setNotesLoading(false);
        }
      }
    }

    fetchNotes();

    return () => {
      cancelled = true;
    };
  }, [user.id, isMe]);

  // Separate notes by review status.
  const approvedNotes = useMemo(
    () => notes.filter((note) => note.review_status === "approved"),
    [notes],
  );

  const pendingNotes = useMemo(
    () => notes.filter((note) => note.review_status === "pending"),
    [notes],
  );

  const rejectedNotes = useMemo(
    () => notes.filter((note) => note.review_status === "rejected"),
    [notes],
  );

  // Check whether the logged-in user already follows this profile.
  useEffect(() => {
    if (isMe) {
      setFollowChecking(false);
      return;
    }

    let cancelled = false;

    async function checkFollowStatus() {
      setFollowChecking(true);
      setFollowError("");

      try {
        const { data } = await api.get<FollowStatusResponse>(
          "/social/is_following/",
          {
            params: {
              user_id: user.id,
            },
          },
        );

        if (!cancelled && data.status === "success") {
          setFollow(data.is_following);
        }
      } catch (error) {
        console.error("Could not check follow status:", error);

        if (!cancelled) {
          setFollowError("Could not load follow status. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setFollowChecking(false);
        }
      }
    }

    checkFollowStatus();

    return () => {
      cancelled = true;
    };
  }, [user.id, isMe]);

  async function handleFollowChange() {
    if (followLoading || followChecking) return;

    setFollowLoading(true);
    setFollowError("");

    const previousFollow = follow;

    try {
      const csrfToken = await getCSRFToken();
      api.defaults.headers.post["X-CSRFToken"] = csrfToken;
      const { data } = await api.post<FollowStatusResponse>(
        `/social/follow/${user.id}/`,
        {},
      );

      if (data.status === "success") {
        setFollow(data.is_following);

        if (data.is_following !== previousFollow) {
          setFollowersCount((previous) =>
            Math.max(
              0,
              previous + (data.is_following ? 1 : -1),
            ),
          );
        }
      } else {
        setFollowError("Unable to update follow status. Please try again.");
      }
    } catch (error) {
      console.error("Follow request failed:", error);
      setFollowError("Unable to update follow status. Please try again.");
    } finally {
      setFollowLoading(false);
    }
  }

  const totalUploads = isMe
    ? notes.length
    : approvedNotes.length;

  const initials = user.full_name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const details = (
    isTeacher
      ? [
          { icon: Briefcase, label: "Designation", value: user.designation },
          { icon: Hash, label: "Employee ID", value: user.employee_id },
        ]
      : [
          { icon: Hash, label: "Student ID", value: user.student_id },
          { icon: GraduationCap, label: "Intake", value: user.intake },
          { icon: BookOpen, label: "Section", value: user.section },
        ]
  ).filter((d) => d.value);

  const tabs = [
    { key: "approved" as const, label: "Approved", count: approvedNotes.length, Icon: CheckCircle2 },
    { key: "pending" as const, label: "Pending", count: pendingNotes.length, Icon: Clock },
    { key: "rejected" as const, label: "Rejected", count: rejectedNotes.length, Icon: XCircle },
  ];

  const sectionProps = {
    approved: {
      title: isMe ? "Approved notes" : "Published notes",
      description: "Approved and visible to everyone.",
      notes: approvedNotes,
      emptyMessage: "No approved notes yet.",
    },
    pending: {
      title: "Pending review",
      description: "Waiting for an administrator to review.",
      notes: pendingNotes,
      emptyMessage: "Nothing waiting for review.",
    },
    rejected: {
      title: "Not approved",
      description: "Check the reason on each note before re-uploading.",
      notes: rejectedNotes,
      emptyMessage: "No rejected notes — nice work.",
    },
  }[isMe ? tab : "approved"];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
      <Link
        to="/feeds"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to feed
      </Link>

      {/* Profile hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-xl shadow-primary/5">
        <div className="relative h-32 bg-gradient-to-br from-primary/25 via-primary/10 to-transparent sm:h-40">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
        </div>

        <div className="relative px-6 pb-8 sm:px-10">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-4 sm:-mt-14">
            <div className="grid h-24 w-24 place-items-center rounded-3xl bg-primary font-display text-3xl text-primary-foreground shadow-2xl shadow-primary/30 ring-4 ring-card sm:h-28 sm:w-28 sm:text-4xl">
              {initials}
            </div>

            {!isMe && (
              <button
                type="button"
                onClick={handleFollowChange}
                disabled={followLoading || followChecking}
                className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium transition-all disabled:opacity-50 ${
                  follow
                    ? "border border-border bg-background text-foreground hover:bg-muted"
                    : "bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:-translate-y-0.5"
                }`}
              >
                {followChecking || followLoading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : follow ? (
                  <UserCheck className="h-4 w-4" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {followChecking
                  ? "Checking"
                  : followLoading
                    ? "Please wait"
                    : follow
                      ? "Following"
                      : "Follow"}
              </button>
            )}
          </div>

          <div className="mt-5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {user.full_name}
              </h1>
              {isTeacher && <BadgeCheck className="h-6 w-6 text-primary" />}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {isTeacher ? "Faculty" : "Student"}
              </span>
              {user.department_name && <span>{user.department_name}</span>}
            </div>
          </div>

          {details.length > 0 && (
            <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {details.map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/60 px-4 py-3"
                >
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
                    <dd className="truncate text-sm font-medium">{value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          )}

          {profile.courses.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {profile.courses.map((course) => (
                <span
                  key={course}
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium"
                >
                  {course}
                </span>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="mt-8 grid grid-cols-3 divide-x divide-border/60 rounded-2xl border border-border/60 bg-background/60">
            {[
              { label: "Uploads", value: totalUploads },
              { label: "Followers", value: followersCount },
              { label: "Following", value: profile.following },
            ].map((s) => (
              <div key={s.label} className="px-4 py-4 text-center">
                <p className="font-display text-2xl font-semibold tabular-nums sm:text-3xl">{s.value}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {followError && !isMe && (
        <p className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          {followError}
        </p>
      )}

      {/* Uploads */}
      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            {isMe ? "My uploads" : "Uploads"}
          </h2>

          {isMe && !notesLoading && !notesError && (
            <div className="inline-flex gap-1 rounded-full bg-muted p-1">
              {tabs.map(({ key, label, count, Icon }) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={tab === key}
                  onClick={() => setTab(key)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                    tab === key
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  <span className="tabular-nums opacity-60">{count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {notesLoading && (
          <div className="mt-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-border/60 bg-card p-6">
                <div className="flex gap-4">
                  <div className="h-14 w-11 rounded-lg bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 rounded bg-muted" />
                    <div className="h-3 w-2/3 rounded bg-muted" />
                    <div className="h-3 w-1/2 rounded bg-muted" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!notesLoading && notesError && (
          <p className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-destructive">
            {notesError}
          </p>
        )}

        {!notesLoading && !notesError && (
          <NotesSection {...sectionProps} showStatus={isMe} />
        )}
      </section>
    </div>
  );
}

function NotesSection({
  title,
  description,
  notes,
  emptyMessage,
  showStatus,
}: {
  title: string;
  description: string;
  notes: Note[];
  emptyMessage: string;
  showStatus: boolean;
}) {
  return (
    <div className="mt-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {notes.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-border py-14 text-center">
          <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Inbox className="h-5 w-5" />
          </div>
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note, i) => (
            <div
              key={note.id}
              className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
              style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}
            >
              <NoteCard note={note} showStatus={showStatus} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NoteCard({
  note,
  showStatus,
}: {
  note: Note;
  showStatus: boolean;
}) {
  const rating = Number(note.rating_avg);

  const formattedDate = new Date(note.created_at).toLocaleDateString(
    undefined,
    { year: "numeric", month: "short", day: "numeric" },
  );

  const status = {
    pending: { cls: "bg-highlight/25 text-foreground", label: "Pending review", Icon: Clock },
    approved: { cls: "bg-success/15 text-success", label: "Approved", Icon: CheckCircle2 },
    rejected: { cls: "bg-destructive/15 text-destructive", label: "Rejected", Icon: XCircle },
  }[note.review_status];

  const rejectionReason = note.rejection_reason || note.review_reason;

  return (
    <article className="group rounded-2xl border border-border/60 bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="grid h-14 w-11 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-md shadow-primary/20">
          <FileText className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
              {note.type}
            </span>
            <span className="text-xs text-muted-foreground">
              Intake {note.intake} · Section {note.section}
            </span>
            {showStatus && (
              <span className={`ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${status.cls}`}>
                <status.Icon className="h-3 w-3" />
                {status.label}
              </span>
            )}
          </div>

          <h4 className="font-display text-lg font-semibold leading-snug tracking-tight">
            {note.title}
          </h4>

          {note.description && (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {note.description}
            </p>
          )}

          {showStatus && note.review_status === "rejected" && (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-destructive">
                <XCircle className="h-3.5 w-3.5" />
                Rejection reason
              </div>
              <p className="mt-1 text-sm text-foreground">
                {rejectionReason || "No rejection reason was provided by the administrator."}
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                By <span className="font-medium text-foreground">{note.uploader_name}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {formattedDate}
              </span>
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-highlight text-highlight" />
                <span className="font-medium text-foreground">
                  {Number.isFinite(rating) ? rating.toFixed(1) : "0.0"}
                </span>
                <span>({note.rating_count})</span>
              </span>
            </div>

            {note.file_url ? (
              <Link
                to="/pdf/$id"
                params={{ id: String(note.id) }}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-md shadow-primary/20 transition-transform hover:-translate-y-0.5"
              >
                View PDF
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <p className="text-xs text-destructive">PDF link is missing.</p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}