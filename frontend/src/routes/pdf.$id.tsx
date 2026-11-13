import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Download,
  ExternalLink,
  Flag,
  GraduationCap,
  LoaderCircle,
  Star,
  Users,
  MessageCircle,
  Send,
} from "lucide-react";
import { StatusPill, Stars } from "@/components/PdfCard";
import { getCSRFToken } from "@/lib/utils";
import api from "@/lib/api";
import axios from "axios";

export const Route = createFileRoute("/pdf/$id")({
  loader: async ({ params }) => {
    const noteId = Number.parseInt(params.id.replace(/\D/g, ""), 10);

    if (!Number.isFinite(noteId)) {
      throw notFound();
    }

    try {
      const { data } = await api.get(`/notes/${noteId}/detail/`);
      return { note: data.note };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        throw notFound();
      }
      throw notFound();
    }
  },

  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.note.title ?? "PDF"} — Suggestion Hub` },
      {
        name: "description",
        content: loaderData?.note.description ?? "Course PDF",
      },
      { property: "og:title", content: loaderData?.note.title ?? "PDF" },
      {
        property: "og:description",
        content: loaderData?.note.description ?? "Course PDF",
      },
    ],
  }),

  component: PdfPage,
});

type NoteDetail = {
  id: number;
  title: string;
  description: string | null;
  type: "note" | "suggestion";
  intake: string;
  section: string | null;
  rating_avg: string;
  rating_count: number;
  created_at: string | null;
  review_status: "pending" | "approved" | "rejected";
  uploader_id: number;
  uploader_name: string;
  course_code: string | null;
  is_owner: boolean;
  my_rating: number;
  file_url: string;
  file_type?: "pdf" | "video";
};

type Comment = {
  id: number;
  user_id: number;
  commenter_name: string;
  comment: string;
  created_at: string;
};

const REASONS = ["Wrong content", "Copyright", "Inappropriate", "Corrupted file", "Duplicate"];

function CommentsSection({ noteId }: { noteId: number }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentsError, setCommentsError] = useState("");
  const [commentSuccess, setCommentSuccess] = useState("");

  async function fetchComments() {
    setCommentsLoading(true);
    setCommentsError("");

    try {
      const response = await api.get("/social/comments/", {
        params: {
          note_id: noteId,
        },
      });

      if (response.data.status === "success") {
        setComments(response.data.comments ?? []);
      } else {
        setCommentsError("Could not load comments.");
      }
    } catch (error: unknown) {
      console.error("Failed to fetch comments:", error);

      if (axios.isAxiosError(error)) {
        setCommentsError(
          error.response?.data?.error ??
            error.response?.data?.detail ??
            "Could not load comments. Please try again.",
        );
      } else {
        setCommentsError("An unexpected error occurred.");
      }
    } finally {
      setCommentsLoading(false);
    }
  }

  useEffect(() => {
    void fetchComments();
  }, [noteId]);

  async function handleCommentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedComment = commentText.trim();

    if (!trimmedComment || commentSubmitting) return;

    setCommentSubmitting(true);
    setCommentsError("");
    setCommentSuccess("");

    try {
      const csrfToken = await getCSRFToken();

      const formData = new FormData();
      formData.append("note_id", String(noteId));
      formData.append("comment_text", trimmedComment);

      await api.post("/social/comments/", formData, {
        headers: {
          Accept: "application/json",
          ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
        },
      });

      setCommentText("");
      setCommentSuccess("Your comment was posted successfully.");

      await fetchComments();
    } catch (error: unknown) {
      console.error("Failed to post comment:", error);

      if (axios.isAxiosError(error)) {
        setCommentsError(
          error.response?.data?.error ??
            error.response?.data?.detail ??
            "Could not post your comment. Please try again.",
        );
      } else {
        setCommentsError("An unexpected error occurred.");
      }
    } finally {
      setCommentSubmitting(false);
    }
  }

  function formatCommentDate(date: string) {
    const parsedDate = new Date(date.includes("T") ? date : date.replace(" ", "T") + "Z");

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <section className="mt-8 rounded-3xl border border-border/60 bg-card p-5 shadow-xl shadow-primary/5 sm:p-7">
      {/* Section heading */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold tracking-tight">Comments</h2>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Discuss this material, ask questions, and help other students.
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-semibold">
          {comments.length} {comments.length === 1 ? "comment" : "comments"}
        </span>
      </div>

      {/* Add comment form */}
      <form onSubmit={handleCommentSubmit} className="mb-7">
        <label htmlFor="comment-text" className="mb-2 block text-sm font-medium">
          Write a comment
        </label>

        <textarea
          id="comment-text"
          value={commentText}
          onChange={(event) => setCommentText(event.target.value)}
          placeholder="Share your thoughts or ask a question..."
          rows={3}
          maxLength={2000}
          disabled={commentSubmitting}
          className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
        />

        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">{commentText.length}/2000</span>

          <button
            type="submit"
            disabled={!commentText.trim() || commentSubmitting}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {commentSubmitting ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Post comment
              </>
            )}
          </button>
        </div>
      </form>

      {/* Success message */}
      {commentSuccess && (
        <div className="mb-4 rounded-xl border border-success/30 bg-success/5 p-3 text-sm text-success">
          {commentSuccess}
        </div>
      )}

      {/* Error message */}
      {commentsError && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {commentsError}

          <button
            type="button"
            onClick={fetchComments}
            disabled={commentsLoading}
            className="ml-2 font-semibold underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Comments list */}
      <div className="space-y-4">
        {commentsLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Loading comments...
          </div>
        ) : comments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-10 text-center">
            <MessageCircle className="mx-auto h-8 w-8 text-muted-foreground/50" />

            <p className="mt-3 text-sm font-medium">No comments yet</p>

            <p className="mt-1 text-xs text-muted-foreground">
              Be the first to start a discussion.
            </p>
          </div>
        ) : (
          comments.map((comment) => {
            const initials = comment.commenter_name
              .split(" ")
              .map((word) => word[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <article
                key={comment.id}
                className="flex gap-3 rounded-2xl border border-border/50 bg-background/50 p-4"
              >
                <Link
                  to="/profile/$id"
                  params={{ id: String(comment.user_id) }}
                  aria-label={`View ${comment.commenter_name}'s profile`}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
                >
                  {initials || "U"}
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 hover:gap-3 transition-all">
                    <Link
                      to="/profile/$id"
                      params={{ id: String(comment.user_id) }}
                      className="text-sm font-semibold transition-colors hover:text-primary"
                    >
                      {comment.commenter_name}
                    </Link>

                    <time className="text-xs text-muted-foreground">
                      {formatCommentDate(comment.created_at)}
                    </time>
                  </div>

                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                    {comment.comment}
                  </p>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function PdfPage() {
  const loader = Route.useLoaderData();
  const note: NoteDetail = loader.note;

  const [ratingAvg, setRatingAvg] = useState(note.rating_avg);
  const [ratingCount, setRatingCount] = useState(note.rating_count);
  const [myRating, setMyRating] = useState(note.my_rating);
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingError, setRatingError] = useState("");

  const [reportFormOpen, setReportFormOpen] = useState(false);
  const [reportReason, setReportReason] = useState(REASONS[0]);
  const [reportDetail, setReportDetail] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");

  const canRate = !note.is_owner && note.review_status === "approved";

  async function handleRate(stars: number) {
    if (ratingLoading || !canRate) return;

    setRatingLoading(true);
    setRatingError("");

    try {
      const csrfToken = await getCSRFToken();

      const response = await api.post(
        `/notes/${note.id}/rate/`,
        { stars },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
          },
        },
      );

      setMyRating(response.data.my_rating);
      setRatingAvg(response.data.rating_avg);
      setRatingCount(response.data.rating_count);
    } catch (error: unknown) {
      console.error("Rating failed:", error);

      if (axios.isAxiosError(error)) {
        setRatingError(
          error.response?.data?.error ??
            error.response?.data?.detail ??
            "Could not save your rating. Please try again.",
        );
      } else {
        setRatingError("An unexpected error occurred.");
      }
    } finally {
      setRatingLoading(false);
    }
  }

  async function handleReportSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (reportLoading) return;

    setReportLoading(true);
    setReportError("");

    try {
      const csrfToken = await getCSRFToken();

      await api.post(
        `/notes/${note.id}/report/`,
        { reason: reportReason, detail: reportDetail.trim() },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
          },
        },
      );

      setReportSent(true);
    } catch (error: unknown) {
      console.error("Report failed:", error);

      if (axios.isAxiosError(error)) {
        setReportError(
          error.response?.data?.error ??
            error.response?.data?.detail ??
            "Could not send the report. Please try again.",
        );
      } else {
        setReportError("An unexpected error occurred.");
      }
    } finally {
      setReportLoading(false);
    }
  }

  const avg = Number(ratingAvg);
  const activeStars = hoverRating || myRating;
  const starLabels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

  const uploaderInitials = note.uploader_name
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const formattedDate = note.created_at
    ? new Date(note.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  const meta = [
    { icon: GraduationCap, label: "Intake", value: note.intake },
    { icon: Users, label: "Section", value: note.section },
    { icon: CalendarDays, label: "Uploaded", value: formattedDate },
  ].filter((m) => m.value);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <Link
        to="/feeds"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to feed
      </Link>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* PDF preview */}
        <div className="min-w-0">
          <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-2xl shadow-primary/5">
            <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <div className="grid h-8 w-7 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
                  <BookOpen className="h-3.5 w-3.5" />
                </div>
                <span className="truncate text-sm font-medium">{note.title}</span>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <a
                  href={note.file_url}
                  download
                  aria-label="Download PDF"
                  className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Download className="h-4 w-4" />
                </a>

                <a
                  href={note.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open full screen"
                  className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>

            {note.file_type === "video" ? (
              <video
                src={note.file_url}
                controls
                playsInline
                preload="metadata"
                className="aspect-video max-h-[80vh] min-h-[500px] w-full bg-black"
              >
                Your browser cannot play this video.{" "}
                <a href={note.file_url} target="_blank" rel="noopener noreferrer">
                  Open it here instead.
                </a>
              </video>
            ) : (
              <iframe
                src={note.file_url}
                title={note.title}
                className="aspect-[3/4] max-h-[80vh] min-h-[500px] w-full bg-muted"
              >
                <p>
                  Your browser cannot display PDFs.{" "}
                  <a href={note.file_url} target="_blank" rel="noopener noreferrer">
                    Open it here instead.
                  </a>
                </p>
              </iframe>
            )}
          </div>
        </div>

        {/* Info, rating and report */}
        <aside className="space-y-5 lg:sticky lg:top-24">
          <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-6 shadow-xl shadow-primary/5">
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />

            <div className="relative flex flex-wrap gap-2">
              {note.course_code && (
                <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                  {note.course_code}
                </span>
              )}

              <span
                className={`rounded-full px-3 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                  note.type === "note"
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-highlight/25 text-foreground"
                }`}
              >
                {note.type}
              </span>

              {note.review_status !== "approved" && <StatusPill status={note.review_status} />}
            </div>

            <h1 className="relative mt-4 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
              {note.title}
            </h1>

            {note.description && (
              <p className="relative mt-3 text-sm leading-relaxed text-muted-foreground">
                {note.description}
              </p>
            )}

            {/* Rating summary */}
            <div className="relative mt-5 flex items-center gap-3">
              <span className="font-display text-3xl font-semibold tabular-nums">
                {avg > 0 ? avg.toFixed(1) : "—"}
              </span>

              <div>
                <Stars value={avg} />
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {ratingCount > 0
                    ? `${ratingCount} rating${ratingCount === 1 ? "" : "s"}`
                    : "No ratings yet"}
                </p>
              </div>
            </div>

            {meta.length > 0 && (
              <dl className="relative mt-5 grid grid-cols-3 gap-2">
                {meta.map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-border/60 bg-background/60 px-3 py-2.5"
                  >
                    <dt className="flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      <Icon className="h-3 w-3" /> {label}
                    </dt>
                    <dd className="mt-1 truncate text-sm font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {/* Uploader */}
            <Link
              to="/profile/$id"
              params={{ id: String(note.uploader_id) }}
              className="relative mt-5 flex items-center gap-3 rounded-2xl border border-border/60 bg-background/60 p-3 transition-colors hover:border-primary/30 hover:bg-primary/5"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary font-display text-sm text-primary-foreground">
                {uploaderInitials}
              </div>

              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  Uploaded by
                </p>
                <p className="truncate text-sm font-semibold">{note.uploader_name}</p>
              </div>
            </Link>

            <div className="relative mt-5 grid grid-cols-2 gap-2">
              <a
                href={note.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:-translate-y-0.5"
              >
                <ExternalLink className="h-4 w-4" /> Full screen
              </a>

              <a
                href={note.file_url}
                download
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
              >
                <Download className="h-4 w-4" /> Download
              </a>
            </div>
          </div>

          {/* Rate this PDF */}
          {note.review_status === "approved" && (
            <div className="rounded-3xl border border-border/60 bg-card p-6">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {note.is_owner ? "Your upload" : myRating ? "Your rating" : "Rate this PDF"}
                </p>

                {ratingLoading && (
                  <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {note.is_owner ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  You can't rate your own upload.
                </p>
              ) : (
                <>
                  <div
                    className="mt-3 flex items-center gap-1"
                    onMouseLeave={() => setHoverRating(0)}
                  >
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        disabled={!canRate || ratingLoading}
                        onMouseEnter={() => canRate && setHoverRating(star)}
                        onClick={() => handleRate(star)}
                        aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
                        className="rounded-lg p-1 transition-transform duration-150 hover:scale-110 disabled:cursor-default disabled:hover:scale-100"
                      >
                        <Star
                          className={`h-7 w-7 transition-colors ${
                            activeStars >= star ? "fill-highlight text-highlight" : "text-border"
                          }`}
                        />
                      </button>
                    ))}

                    <span className="ml-2 text-sm font-medium text-muted-foreground">
                      {starLabels[activeStars] ?? ""}
                    </span>
                  </div>

                  {myRating > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      You rated this {myRating} star
                      {myRating === 1 ? "" : "s"}. Tap a star to change it.
                    </p>
                  )}
                </>
              )}

              {ratingError && (
                <p
                  className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive"
                  role="alert"
                >
                  {ratingError}
                </p>
              )}
            </div>
          )}

          {/* Report this PDF */}
          {!reportSent ? (
            reportFormOpen ? (
              <form
                className="animate-in fade-in slide-in-from-top-1 space-y-4 rounded-3xl border border-destructive/20 bg-card p-6"
                onSubmit={handleReportSubmit}
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Flag className="h-4 w-4 text-destructive" /> Report a problem
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Reason
                  </p>

                  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Reason">
                    {REASONS.map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        role="radio"
                        aria-checked={reportReason === reason}
                        disabled={reportLoading}
                        onClick={() => setReportReason(reason)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                          reportReason === reason
                            ? "border-destructive bg-destructive text-destructive-foreground"
                            : "border-border bg-background hover:border-destructive/40"
                        }`}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="report-detail"
                    className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    Details (optional)
                  </label>

                  <textarea
                    id="report-detail"
                    className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
                    rows={3}
                    value={reportDetail}
                    onChange={(event) => setReportDetail(event.target.value)}
                    placeholder="Help admins understand the problem"
                    maxLength={1000}
                    disabled={reportLoading}
                  />

                  <p className="mt-1 text-right text-[10px] tabular-nums text-muted-foreground">
                    {reportDetail.length}/1000
                  </p>
                </div>

                {reportError && (
                  <p
                    className="rounded-xl border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive"
                    role="alert"
                  >
                    {reportError}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={reportLoading}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-destructive px-4 py-2.5 text-sm font-medium text-destructive-foreground transition-opacity disabled:opacity-50"
                  >
                    {reportLoading ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Sending
                      </>
                    ) : (
                      "Send report"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setReportFormOpen(false)}
                    disabled={reportLoading}
                    className="rounded-full border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setReportFormOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-full py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
              >
                <Flag className="h-3.5 w-3.5" /> Report this PDF
              </button>
            )
          ) : (
            <div className="flex items-center gap-3 rounded-3xl border border-success/30 bg-success/5 p-4 text-sm">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
              <span>Thanks — your report was sent to the admins.</span>
            </div>
          )}
        </aside>
      </div>

      {/* Comments section */}
      {note.review_status === "approved" && <CommentsSection noteId={note.id} />}
    </div>
  );
}
