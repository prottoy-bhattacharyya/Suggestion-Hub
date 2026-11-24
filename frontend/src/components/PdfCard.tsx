import { Link } from "@tanstack/react-router";
import { FileText, Play, Star, Download, ExternalLink } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { userById, type Status, type Pdf } from "@/lib/mock-data";

export type Note = {
  id: number;
  title: string;
  description: string;
  type: "note" | "suggestion";
  course_code: string;
  intake: string;
  section: string;
  rating_avg: string;
  rating_count: number;
  created_at: string;
  uploader_name: string;
  uploader_avatar_url?: string | null;
  file_url?: string | null;
  file_type?: "pdf" | "video";
};

function shortDescription(description: string, wordLimit = 20) {
  const words = description.trim().split(/\s+/).filter(Boolean);
  if (words.length <= wordLimit) return description.trim();
  return `${words.slice(0, wordLimit).join(" ")}...`;
}

export function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Star className="h-4 w-4 fill-highlight text-highlight" />
      {value > 0 ? value.toFixed(1) : "—"}
    </span>
  );
}

export function StatusPill({ status }: { status: Status }) {
  const statusClass = {
    pending: "bg-highlight/25 text-foreground",
    approved: "bg-success/15 text-success",
    rejected: "bg-destructive/15 text-destructive",
  }[status];

  return (
    <span className={`chip ${statusClass}`}>
      {status === "pending" ? "Pending review" : status}
    </span>
  );
}

export function PdfCard({ pdf }: { pdf: Pdf }) {
  const uploader = userById(pdf.uploaderId);

  return (
    <Link to="/pdf/$id" params={{ id: pdf.id }} className="no-underline">
      <article className="paper-card group p-5">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-10 shrink-0 place-items-center rounded-sm bg-primary text-primary-foreground">
            <FileText className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="chip bg-accent">{pdf.course}</span>

              <span
                className={`chip ${
                  pdf.type === "note"
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-highlight/25 text-foreground"
                }`}
              >
                {pdf.type}
              </span>

              {pdf.status !== "approved" && <StatusPill status={pdf.status} />}
            </div>

            <h3 className="font-display text-lg leading-snug">
              <Link
                to="/pdf/$id"
                params={{ id: pdf.id }}
                className="hover:underline"
              >
                {pdf.title}
              </Link>
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              {shortDescription(pdf.description)}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
              <span>
                by{" "}
                <Link
                  to="/profile/$id"
                  params={{ id: uploader.id }}
                  className="font-medium text-foreground hover:underline"
                >
                  {uploader.name}
                </Link>
              </span>

              <span>{pdf.date}</span>

              <span>{pdf.pages} pages</span>

              <Stars value={pdf.rating} />

              <span>
                ({pdf.ratingCount}{" "}
                {pdf.ratingCount === 1 ? "rating" : "ratings"})
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

export function NoteCard({ note }: { note: Note }) {
  const rating = Number(note.rating_avg) || 0;

  const formattedDate = note.created_at
    ? new Date(note.created_at).toLocaleDateString()
    : "Unknown date";

  return (
    <Link to="/pdf/$id" params={{ id: String(note.id) }} className="no-underline">
      <article className="paper-card group p-5">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-10 shrink-0 place-items-center rounded-sm bg-primary text-primary-foreground">
            {note.file_type === "video" ? (
              <Play className="h-5 w-5" />
            ) : (
              <FileText className="h-5 w-5" />
            )}
          </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {/* Course code */}
            {note.course_code && (
              <span className="chip bg-accent">
                {note.course_code}
              </span>
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

            <span className="text-xs text-muted-foreground">
              Intake {note.intake} · Section {note.section}
            </span>
          </div>

          <h3 className="font-display text-lg leading-snug">
            {note.title}
          </h3>

          {note.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {shortDescription(note.description)}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              by{" "}
              <UserAvatar
                name={note.uploader_name}
                src={note.uploader_avatar_url}
                className="size-5 text-[9px]"
              />
              <span className="font-medium text-foreground">{note.uploader_name}</span>
            </span>

            <span>{formattedDate}</span>

            <Stars value={rating} />

            <span>
              ({note.rating_count}{" "}
              {note.rating_count === 1 ? "rating" : "ratings"})
            </span>
          </div>
        </div>
      </div>
    </article>
  </Link>
)};