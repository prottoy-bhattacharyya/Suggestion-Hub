import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Download, ExternalLink, Flag, Star, LoaderCircle } from "lucide-react";
import { StatusPill, Stars } from "@/components/PdfCard";
import { getCSRFToken } from "@/lib/utils";
import api from "@/lib/api";
import axios from "axios";

export const Route = createFileRoute("/pdf/$id")({
  loader: async ({ params }) => {
    // Mock links used ids like "p1"; real links are numeric — both strip to 1.
    const noteId = Number.parseInt(params.id.replace(/\D/g, ""), 10);

    if (!Number.isFinite(noteId)) {
      throw notFound();
    }

    try {
      const { data } = await api.get(`/notes/${noteId}/detail/`);
      return { note: data.note };
    } catch (error) {
      // 404 = genuinely missing; 403 = you can't see this pending note.
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
};

const REASONS = ["Wrong content", "Copyright", "Inappropriate", "Corrupted file", "Duplicate"];

function PdfPage() {
  const loader = Route.useLoaderData();
  const note = loader.note;

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

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_320px]">
      {/* PDF preview */}
      <div>
        <div className="paper-card overflow-hidden">
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
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={note.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center gap-2"
          >
            <ExternalLink size={16} />
            Open full screen
          </a>

          <a
            href={note.file_url}
            download
            className="btn-ghost inline-flex items-center gap-2"
          >
            <Download size={16} />
            Download
          </a>
        </div>
      </div>

      {/* Info, rating and report */}
      <aside className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {note.course_code && (
            <span className="chip bg-accent">{note.course_code}</span>
          )}

          <span
            className={`chip ${
              note.type === "note"
                ? "bg-secondary text-secondary-foreground"
                : "bg-highlight/25 text-foreground"
            }`}
          >
            {note.type}
          </span>

          {note.review_status !== "approved" && (
            <StatusPill status={note.review_status} />
          )}
        </div>

        <div>
          <h1 className="text-2xl leading-tight">{note.title}</h1>

          {note.description && (
            <p className="mt-2 text-sm text-muted-foreground">
              {note.description}
            </p>
          )}

          <p className="mt-3 text-sm">
            Intake {note.intake}
            {note.section ? ` · Section ${note.section}` : ""}
            {note.created_at
              ? ` · ${new Date(note.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}`
              : ""}
          </p>

          <Link
            to="/profile/$id"
            params={{ id: String(note.uploader_id) }}
            className="mt-2 block text-sm"
          >
            by <b className="text-primary">{note.uploader_name}</b>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Stars value={Number(note.rating_avg)} />
          <span className="text-sm text-muted-foreground">
            {Number(ratingAvg) > 0
              ? `${Number(ratingAvg).toFixed(1)} average rating`
              : "No ratings yet"}
          </span>
        </div>

        {/* Rate this PDF */}
        {note.review_status === "approved" && (
          <div className="paper-card p-4">
            <p className="label-sm">
              {note.is_owner
                ? "You can't rate your own upload"
                : myRating
                  ? "Your rating"
                  : "Rate this PDF"}
            </p>

            <div
              className="mt-2 flex gap-1"
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
                  className="disabled:cursor-default"
                >
                  <Star
                    className={`h-6 w-6 ${
                      (hoverRating || myRating) >= star
                        ? "fill-highlight text-highlight"
                        : "text-border"
                    }`}
                  />
                </button>
              ))}

              {ratingLoading && (
                <LoaderCircle size={22} className="self-center animate-spin" />
              )}
            </div>

            {myRating > 0 && !note.is_owner && (
              <p className="mt-2 text-xs text-muted-foreground">
                You rated this {myRating} star{myRating === 1 ? "" : "s"}.
                Click a star to change it.
              </p>
            )}

            {ratingError && (
              <p className="mt-2 text-xs text-destructive" role="alert">
                {ratingError}
              </p>
            )}
          </div>
        )}

        {/* Report this PDF */}
        {!reportSent ? (
          reportFormOpen ? (
            <form
              className="paper-card space-y-3 p-4"
              onSubmit={handleReportSubmit}
            >
              <div>
                <label htmlFor="report-reason" className="label-sm">
                  Reason
                </label>
                <select
                  id="report-reason"
                  className="field w-full"
                  value={reportReason}
                  onChange={(event) => setReportReason(event.target.value)}
                  disabled={reportLoading}
                >
                  {REASONS.map((reason) => (
                    <option key={reason}>{reason}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="report-detail" className="label-sm">
                  Details (optional)
                </label>
                <textarea
                  id="report-detail"
                  className="field w-full"
                  rows={3}
                  value={reportDetail}
                  onChange={(event) => setReportDetail(event.target.value)}
                  placeholder="Help admins understand the problem"
                  maxLength={1000}
                  disabled={reportLoading}
                />
              </div>

              {reportError && (
                <p className="text-xs text-destructive" role="alert">
                  {reportError}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={reportLoading}
                  className="btn-primary flex-1 inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {reportLoading ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send report"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setReportFormOpen(false)}
                  disabled={reportLoading}
                  className="btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setReportFormOpen(true)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive"
            >
              <Flag size={16} />
              Report this PDF
            </button>
          )
        ) : (
          <p className="flex items-center gap-2 text-sm text-success">
            <Flag size={16} />
            Report sent to admins.
          </p>
        )}

        <Link to="/feeds" className="btn-ghost inline-block">
          Back to feed
        </Link>
      </aside>
    </div>
  );
}
