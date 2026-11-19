import {
  createFileRoute,
  Link,
  notFound,
  redirect,
} from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
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
  Inbox,
  Files,
  Users,
  Mail,
} from "lucide-react";

import { NoteCard, type Note as PdfCardNote } from "@/components/PdfCard";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

type ProfileNote = PdfCardNote & {
  course_code?: string;
  review_status: "pending" | "approved" | "rejected";
  rejection_reason?: string | null;
  review_comment?: string | null;
  review_reason?: string | null;
};

type NotesResponse = {
  status: string;
  notes: ProfileNote[];
};

type FollowProfile = {
  id: number;
  full_name: string;
  role: string;
};

type FollowListResponse = {
  status: string;
  followers?: FollowProfile[];
  following?: FollowProfile[];
};

export const Route = createFileRoute("/profile/$id")({
  head: () => ({
    meta: [
      { title: "Profile — Suggestion Hub" },
      {
        name: "description",
        content:
          "Explore academic profiles, published notes, and course contributions on Suggestion Hub.",
      },
      { property: "og:title", content: "Profile — Suggestion Hub" },
      {
        property: "og:description",
        content:
          "Explore academic profiles, published notes, and course contributions on Suggestion Hub.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
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
  const courses = profile.courses ?? [];

  const role = user.role?.toLowerCase() ?? "";
  const isTeacher = role.includes("teacher") || role.includes("faculty");

  const [follow, setFollow] = useState(false);
  const [followersCount, setFollowersCount] = useState(profile.followers);
  const [followLoading, setFollowLoading] = useState(false);
  const [followChecking, setFollowChecking] = useState(!isMe);
  const [followError, setFollowError] = useState("");
  const [followListOpen, setFollowListOpen] = useState<"followers" | "following" | null>(null);
  const [followList, setFollowList] = useState<FollowProfile[]>([]);
  const [followListLoading, setFollowListLoading] = useState(false);
  const [followListError, setFollowListError] = useState("");
  const [followingCount, setFollowingCount] = useState(profile.following);
  const [unfollowPendingId, setUnfollowPendingId] = useState<number | null>(null);

  const [notes, setNotes] = useState<ProfileNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState("");

  const [tab, setTab] = useState<"approved" | "pending" | "rejected">(
    "approved",
  );

  useEffect(() => {
    setFollowersCount(profile.followers);
    setFollowingCount(profile.following);
    setFollow(false);
    setFollowChecking(!isMe);
    setFollowError("");
    setFollowLoading(false);
    setFollowListOpen(null);
    setFollowList([]);
    setFollowListError("");
    setUnfollowPendingId(null);
    setTab("approved");
  }, [profile.followers, profile.following, user.id, isMe]);

  // Fetch notes belonging to this profile.
  useEffect(() => {
    let cancelled = false;

    async function fetchNotes() {
      setNotesLoading(true);
      setNotesError("");

      try {
        const { data } = await api.get<NotesResponse>("/notes/get_notes/", {
          params: {
            user_id: user.id,
          },
        });

        if (!cancelled) {
          if (data.status === "success") {
            // Owners can see all their uploads.
            // Visitors can only see approved uploads.
            const visibleNotes = isMe
              ? data.notes
              : data.notes.filter((note) => note.review_status === "approved");

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
        { action: follow ? "unfollow" : "follow" },
      );

      if (data.status === "success") {
        setFollow(data.is_following);

        if (data.is_following !== previousFollow) {
          setFollowersCount((previous) =>
            Math.max(0, previous + (data.is_following ? 1 : -1)),
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

  async function openFollowList(type: "followers" | "following") {
    setFollowListOpen(type);
    setFollowList([]);
    setFollowListLoading(true);
    setFollowListError("");

    try {
      const endpoint =
        type === "followers"
          ? `/social/followers/${user.id}/`
          : `/social/following/${user.id}/`;
      const { data } = await api.get<FollowListResponse>(endpoint);

      if (data.status === "success") {
        setFollowList(type === "followers" ? data.followers ?? [] : data.following ?? []);
      } else {
        setFollowListError(`Unable to load ${type}.`);
      }
    } catch (error) {
      console.error(`Could not load ${type}:`, error);
      setFollowListError(`Unable to load ${type}. Please try again.`);
    } finally {
      setFollowListLoading(false);
    }
  }

  async function handleUnfollow(personId: number) {
    if (unfollowPendingId !== null) return;

    setUnfollowPendingId(personId);

    try {
      const csrfToken = await getCSRFToken();
      const { data } = await api.post(
        `/social/follow/${personId}/`,
        { action: "unfollow" },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
          },
        },
      );

      if (data.status === "success" && data.is_following === false) {
        setFollowList((people) => people.filter((person) => person.id !== personId));
        setFollowingCount((count) => Math.max(0, count - 1));
      } else {
        setFollowListError("Unable to unfollow this person.");
      }
    } catch (error) {
      console.error("Could not unfollow user:", error);
      setFollowListError("Unable to unfollow this person.");
    } finally {
      setUnfollowPendingId(null);
    }
  }

  const totalUploads = isMe ? notes.length : approvedNotes.length;

  const initials = user.full_name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const details = [
    ...(user.email
      ? [
          {
            icon: Mail,
            label: "Email",
            value: user.email,
          },
        ]
      : []),
    ...(isTeacher
      ? [
          {
            icon: Briefcase,
            label: "Designation",
            value: user.designation,
          },
          {
            icon: Hash,
            label: "Employee ID",
            value: user.employee_id,
          },
          ...(courses.length > 0
            ? [
                {
                  icon: BookOpen,
                  label: "Courses",
                  value: courses.join(", "),
                },
              ]
            : []),
        ]
      : [
          {
            icon: Hash,
            label: "Student ID",
            value: user.student_id,
          },
          {
            icon: GraduationCap,
            label: "Intake",
            value: user.intake,
          },
          {
            icon: BookOpen,
            label: "Section",
            value: user.section,
          },
        ]
    ),
  ].filter((detail) => detail.value);

  const tabs = [
    {
      key: "approved" as const,
      label: "Approved",
      count: approvedNotes.length,
      Icon: CheckCircle2,
    },
    {
      key: "pending" as const,
      label: "Pending",
      count: pendingNotes.length,
      Icon: Clock,
    },
    {
      key: "rejected" as const,
      label: "Rejected",
      count: rejectedNotes.length,
      Icon: XCircle,
    },
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
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
      <div className="mb-8 flex items-center justify-between border-b border-border pb-4">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-3 text-muted-foreground"
        >
          <Link to="/feeds">
            <ArrowLeft aria-hidden="true" />
            Back to feed
          </Link>
        </Button>
        <span className="text-xs font-medium text-muted-foreground">
          Suggestion Hub / Profile
        </span>
      </div>

      {/* Editorial identity header: no decorative banner or floating container. */}
      <section
        aria-labelledby="profile-name"
        className="border-b border-border pb-8 sm:pb-10"
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-7">
          <div
            aria-hidden="true"
            className="grid size-24 shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary/10 font-display text-4xl font-semibold text-primary sm:size-28"
          >
            {initials || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
              <GraduationCap
                className="size-4 text-primary"
                aria-hidden="true"
              />
              <span>{isTeacher ? "Faculty" : "Student"}</span>
              {user.department_name && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="break-words">{user.department_name}</span>
                </>
              )}
            </div>
            <div className="flex items-start gap-3">
              <h1
                id="profile-name"
                className="min-w-0 break-words font-display text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl"
              >
                {user.full_name}
              </h1>
              {isTeacher && (
                <BadgeCheck
                  aria-label="Faculty profile"
                  className="mt-1 size-6 shrink-0 text-primary sm:size-7"
                />
              )}
            </div>
          </div>
          {!isMe && (
            <Button
              type="button"
              size="lg"
              variant={follow ? "outline" : "default"}
              onClick={handleFollowChange}
              disabled={followLoading || followChecking}
              aria-pressed={follow}
              className="w-full shrink-0 sm:w-auto"
            >
              {followChecking || followLoading ? (
                <LoaderCircle
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : follow ? (
                <UserCheck aria-hidden="true" />
              ) : (
                <UserPlus aria-hidden="true" />
              )}
              {followChecking
                ? "Checking"
                : followLoading
                  ? "Please wait"
                  : follow
                    ? "Following"
                    : "Follow"}
            </Button>
          )}
        </div>
        {followError && !isMe && (
          <p
            role="alert"
            className="mt-5 border-l-2 border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {followError}
          </p>
        )}

        <dl className="mt-8 grid grid-cols-3 divide-x divide-border border-t border-border pt-6 sm:ml-35 sm:max-w-xl">
          {[
            { label: "Uploads", value: totalUploads, Icon: Files },
            { label: "Followers", value: followersCount, Icon: Users },
            { label: "Following", value: followingCount, Icon: UserCheck },
          ].map(({ label, value, Icon }, index) => (
            <div key={label} className={index === 0 ? "pr-3" : "px-3 sm:px-6"}>
              {label === "Uploads" ? (
                <>
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon className="hidden size-3.5 sm:block" aria-hidden="true" />
                    {label}
                  </dt>
                  <dd className="mt-2 text-2xl font-semibold tabular-nums sm:text-3xl">
                    {notesLoading ? "—" : value}
                  </dd>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => openFollowList(label.toLowerCase() as "followers" | "following")}
                  className="block text-left"
                  aria-label={`View ${label.toLowerCase()}`}
                >
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon className="hidden size-3.5 sm:block" aria-hidden="true" />
                    {label}
                  </dt>
                  <dd className="mt-2 text-2xl font-semibold tabular-nums transition-colors hover:text-primary sm:text-3xl">
                    {value}
                  </dd>
                </button>
              )}
            </div>
          ))}
        </dl>

        <Dialog
          open={followListOpen !== null}
          onOpenChange={(open) => {
            if (!open) {
              setFollowListOpen(null);
              setFollowList([]);
              setFollowListError("");
            }
          }}
        >
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {followListOpen === "followers" ? "Followers" : "Following"}
              </DialogTitle>
              <DialogDescription>
                {followListOpen === "followers"
                  ? `People following ${user.full_name}`
                  : `People ${user.full_name} follows`}
              </DialogDescription>
            </DialogHeader>

            {followListLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoaderCircle className="size-6 animate-spin text-primary" aria-label="Loading" />
              </div>
            ) : followListError ? (
              <p role="alert" className="rounded-md bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {followListError}
              </p>
            ) : followList.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No users found.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {followList.map((person) => {
                  const personInitials = person.full_name
                    .split(" ")
                    .map((word) => word[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <li key={person.id}>
                      <div className="flex items-center gap-2 py-2">
                        <Link
                          to="/profile/$id"
                          params={{ id: String(person.id) }}
                          onClick={() => setFollowListOpen(null)}
                          className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-1 transition-colors hover:bg-muted"
                        >
                          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                            {personInitials}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{person.full_name}</span>
                            <span className="block text-xs capitalize text-muted-foreground">{person.role}</span>
                          </span>
                        </Link>
                        {isMe && followListOpen === "following" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={unfollowPendingId === person.id}
                            onClick={() => handleUnfollow(person.id)}
                            className="shrink-0"
                          >
                            {unfollowPendingId === person.id ? (
                              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <UserCheck className="size-4" aria-hidden="true" />
                            )}
                            Unfollow
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </DialogContent>
        </Dialog>
      </section>

      <div className="grid gap-10 pt-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12 lg:pt-10">
        <aside
          className="space-y-8 lg:border-r lg:border-border lg:pr-8"
          aria-label="Academic profile"
        >
          <section>
            <h2 className="mb-5 text-sm font-semibold">Academic details</h2>
            {details.length > 0 ? (
              <dl className="grid gap-5 sm:grid-cols-3 lg:grid-cols-1">
                {details.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3">
                    <Icon
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="mt-1 break-words text-sm font-medium">
                        {value}
                      </dd>
                    </div>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                No academic details added.
              </p>
            )}
          </section>
        </aside>

        <section aria-labelledby="uploads-title" className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              id="uploads-title"
              className="font-display text-2xl font-semibold"
            >
              {isMe ? "My uploads" : "Published uploads"}
            </h2>
            {!notesLoading && !notesError && (
              <span className="text-xs text-muted-foreground">
                {sectionProps.notes.length}{" "}
                {sectionProps.notes.length === 1 ? "upload" : "uploads"}
              </span>
            )}
          </div>

          {isMe && !notesLoading && !notesError && (
            <div
              className="mt-5 flex flex-wrap gap-1 border-b border-border pb-2"
              role="group"
              aria-label="Upload review status"
            >
              {tabs.map(({ key, label, count, Icon }) => (
                <Button
                  key={key}
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-pressed={tab === key}
                  onClick={() => setTab(key)}
                  className={
                    tab === key
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground"
                  }
                >
                  <Icon aria-hidden="true" />
                  {label}
                  <span className="ml-1 tabular-nums opacity-70">{count}</span>
                </Button>
              ))}
            </div>
          )}

          {notesLoading && (
            <div
              role="status"
              aria-label="Loading uploads"
              className="mt-6 space-y-4"
            >
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  aria-hidden="true"
                  className="flex gap-4 rounded-lg border border-border p-5 motion-safe:animate-pulse"
                >
                  <div className="h-16 w-12 shrink-0 rounded-md bg-muted" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-2/3 rounded bg-muted" />
                    <div className="h-3 w-1/3 rounded bg-muted" />
                    <div className="h-3 w-1/2 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!notesLoading && notesError && (
            <p
              role="alert"
              className="mt-6 border-l-2 border-destructive bg-destructive/5 p-4 text-sm text-destructive"
            >
              {notesError}
            </p>
          )}
          {!notesLoading && !notesError && (
            <NotesSection {...sectionProps} showStatus={isMe} />
          )}
        </section>
      </div>
    </main>
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
  notes: ProfileNote[];
  emptyMessage: string;
  showStatus: boolean;
}) {
  return (
    <div className="mt-6">
      {showStatus && (
        <div className="mb-5">
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      )}
      {notes.length === 0 ? (
        <div className="flex min-h-56 flex-col items-center justify-center border-y border-dashed border-border px-4 text-center">
          <Inbox
            className="mb-4 size-8 text-muted-foreground"
            strokeWidth={1.25}
            aria-hidden="true"
          />
          <p className="text-sm font-medium">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {notes.map((note) => {
            const statusConfig = {
              pending: {
                label: "Pending review",
                className: "bg-secondary text-secondary-foreground",
                Icon: Clock,
              },
              approved: {
                label: "Approved",
                className: "bg-accent text-accent-foreground",
                Icon: CheckCircle2,
              },
              rejected: {
                label: "Rejected",
                className: "bg-destructive/10 text-destructive",
                Icon: XCircle,
              },
            }[note.review_status];
            const rejectionReason =
              note.review_comment ||
              note.review_reason ||
              note.rejection_reason;
            const cardNote: PdfCardNote = {
              ...note,
              course_code: note.course_code ?? "",
            };
            return (
              <div key={note.id}>
                {showStatus && (
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${statusConfig.className}`}
                    >
                      <statusConfig.Icon
                        className="size-3.5"
                        aria-hidden="true"
                      />
                      {statusConfig.label}
                    </span>
                    {note.course_code && (
                      <span className="text-xs text-muted-foreground">
                        {note.course_code}
                      </span>
                    )}
                  </div>
                )}
                <NoteCard note={cardNote} />
                {showStatus && note.review_status === "rejected" && (
                  <div className="mt-3 border-l-2 border-destructive bg-destructive/5 px-4 py-3">
                    <p className="flex items-center gap-2 text-xs font-semibold text-destructive">
                      <XCircle className="size-3.5" aria-hidden="true" />
                      Rejection reason
                    </p>
                    <p className="mt-2 break-words text-sm leading-relaxed">
                      {rejectionReason ||
                        "No rejection reason was provided by the administrator."}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}