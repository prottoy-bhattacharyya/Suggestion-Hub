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
} from "lucide-react";

import api from "@/lib/api";
import { getSessionUser } from "@/lib/auth";

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

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {/* Profile information */}
      <div className="paper-card flex flex-wrap items-center gap-6 p-6">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-primary font-display text-2xl text-primary-foreground">
          {user.full_name
            .split(" ")
            .map((word) => word[0])
            .join("")
            .slice(0, 2)}
        </div>

        <div className="flex-1">
          <h1 className="text-3xl">{user.full_name}</h1>

          <p className="text-sm text-muted-foreground">
            {isTeacher ? "Teacher" : "Student"}
            {user.department_name && ` · ${user.department_name}`}
          </p>

          {isTeacher ? (
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              {user.designation && (
                <p>
                  <span className="font-medium text-foreground">
                    Designation:
                  </span>{" "}
                  {user.designation}
                </p>
              )}

              {user.employee_id && (
                <p>
                  <span className="font-medium text-foreground">
                    Employee ID:
                  </span>{" "}
                  {user.employee_id}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              {user.student_id && (
                <p>
                  <span className="font-medium text-foreground">
                    Student ID:
                  </span>{" "}
                  {user.student_id}
                </p>
              )}

              {user.intake && (
                <p>
                  <span className="font-medium text-foreground">
                    Intake:
                  </span>{" "}
                  {user.intake}
                </p>
              )}

              {user.section && (
                <p>
                  <span className="font-medium text-foreground">
                    Section:
                  </span>{" "}
                  {user.section}
                </p>
              )}
            </div>
          )}

          {profile.courses.length > 0 && (
            <p className="mt-2 text-sm">
              {profile.courses.join(", ")}
            </p>
          )}
        </div>

        {/* Profile statistics */}
        <div className="flex gap-6 text-center">
          <div>
            <p className="font-display text-2xl">{totalUploads}</p>
            <p className="text-xs text-muted-foreground">Uploads</p>
          </div>

          <div>
            <p className="font-display text-2xl">{followersCount}</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </div>

          <div>
            <p className="font-display text-2xl">{profile.following}</p>
            <p className="text-xs text-muted-foreground">Following</p>
          </div>
        </div>

        {/* Follow button */}
        {!isMe && (
          <button
            onClick={handleFollowChange}
            disabled={followLoading || followChecking}
            className={
              follow
                ? "btn-ghost disabled:opacity-50"
                : "btn-primary disabled:opacity-50"
            }
          >
            {followChecking
              ? "Checking..."
              : followLoading
                ? "Please wait..."
                : follow
                  ? "Following"
                  : "Follow"}
          </button>
        )}
      </div>

      {followError && !isMe && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {followError}
        </p>
      )}

      {/* Notes sections */}
      <div className="mt-10">
        <h2 className="text-xl">
          {isMe ? "My uploads" : "Uploads"}
        </h2>

        {notesLoading && (
          <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Loading uploads...
          </div>
        )}

        {!notesLoading && notesError && (
          <p className="py-10 text-center text-sm text-destructive">
            {notesError}
          </p>
        )}

        {!notesLoading && !notesError && (
          <>
            {/* Approved notes */}
            <NotesSection
              title="Approved Notes"
              description="Notes that have been approved and are visible to everyone."
              notes={approvedNotes}
              icon={<CheckCircle2 className="h-5 w-5" />}
              iconClass="text-success"
              emptyMessage="No approved notes yet."
              showStatus={isMe}
            />

            {/* Pending notes — visible only to the owner */}
            {isMe && (
              <NotesSection
                title="Pending Notes"
                description="These notes are waiting for administrator review."
                notes={pendingNotes}
                icon={<Clock className="h-5 w-5" />}
                iconClass="text-highlight"
                emptyMessage="No pending notes."
                showStatus
              />
            )}

            {/* Rejected notes — visible only to the owner */}
            {isMe && (
              <NotesSection
                title="Rejected Notes"
                description="These notes were not approved. Check the reason below."
                notes={rejectedNotes}
                icon={<XCircle className="h-5 w-5" />}
                iconClass="text-destructive"
                emptyMessage="No rejected notes."
                showStatus
              />
            )}
          </>
        )}
      </div>

      <Link to="/feeds" className="btn-ghost mt-8 inline-block">
        Back to feed
      </Link>
    </div>
  );
}

function NotesSection({
  title,
  description,
  notes,
  icon,
  iconClass,
  emptyMessage,
  showStatus,
}: {
  title: string;
  description: string;
  notes: Note[];
  icon: React.ReactNode;
  iconClass: string;
  emptyMessage: string;
  showStatus: boolean;
}) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className={iconClass}>{icon}</span>
            <h3 className="text-lg font-semibold">{title}</h3>
            <span className="chip bg-secondary text-secondary-foreground">
              {notes.length}
            </span>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      {notes.length === 0 ? (
        <p className="paper-card py-6 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              showStatus={showStatus}
            />
          ))}
        </div>
      )}
    </section>
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
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  );

  const statusClass = {
    pending: "bg-highlight/25 text-foreground",
    approved: "bg-success/15 text-success",
    rejected: "bg-destructive/15 text-destructive",
  }[note.review_status];

  const rejectionReason =
    note.rejection_reason || note.review_reason;

  return (
    <article className="paper-card p-5">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-10 shrink-0 place-items-center rounded-sm bg-primary text-primary-foreground">
          <FileText className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="chip bg-secondary text-secondary-foreground">
              {note.type}
            </span>

            <span className="text-xs text-muted-foreground">
              Intake {note.intake} · Section {note.section}
            </span>

            {showStatus && (
              <span className={`chip ${statusClass}`}>
                {note.review_status === "pending"
                  ? "Pending review"
                  : note.review_status}
              </span>
            )}
          </div>

          <h4 className="font-display text-lg leading-snug">
            {note.title}
          </h4>

          {note.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {note.description}
            </p>
          )}

          {/* Rejection reason */}
          {showStatus && note.review_status === "rejected" && (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                <XCircle className="h-4 w-4" />
                Rejection reason
              </div>

              <p className="mt-1 text-sm text-foreground">
                {rejectionReason ||
                  "No rejection reason was provided by the administrator."}
              </p>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span>
              By{" "}
              <span className="font-medium text-foreground">
                {note.uploader_name}
              </span>
            </span>

            <span>{formattedDate}</span>

            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-highlight text-highlight" />
              {Number.isFinite(rating) ? rating.toFixed(1) : "0.0"}
            </span>

            <span>({note.rating_count} ratings)</span>
          </div>

          {note.file_url ? (
            <Link
              to="/pdf/$id"
              params={{ id: String(note.id) }}
              className="btn-primary mt-4 inline-flex items-center gap-2"
              
            >
              <FileText className="h-4 w-4" />
              View PDF
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <p className="mt-3 text-xs text-destructive">
              PDF link is missing from the server response.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}