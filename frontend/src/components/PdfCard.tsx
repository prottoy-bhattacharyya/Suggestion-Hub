import { Link } from "@tanstack/react-router";
import { FileText, Star } from "lucide-react";
import { type Pdf, userById } from "@/lib/mock-data";

export function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Star className="h-4 w-4 fill-highlight text-highlight" />
      {value ? value.toFixed(1) : "—"}
    </span>
  );
}

export function StatusPill({ status }: { status: Pdf["status"] }) {
  const cls = { pending: "bg-highlight/25 text-foreground", approved: "bg-success/15 text-success", rejected: "bg-destructive/15 text-destructive" }[status];
  return <span className={`chip ${cls}`}>{status === "pending" ? "Pending review" : status}</span>;
}

export function PdfCard({ pdf }: { pdf: Pdf }) {
  const u = userById(pdf.uploaderId);
  return (
    <Link to="/pdf/$id" params={{ id: pdf.id }} className="paper-card group block p-5">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-10 shrink-0 place-items-center rounded-sm bg-primary text-primary-foreground">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="chip bg-accent text-accent-foreground">{pdf.course}</span>
            <span className={`chip ${pdf.type === "note" ? "bg-secondary text-secondary-foreground" : "bg-highlight/25 text-foreground"}`}>{pdf.type}</span>
            <span className="text-xs text-muted-foreground">Intake {pdf.intake} · Sec {pdf.section}</span>
          </div>
          <h3 className="font-display text-lg leading-snug group-hover:text-primary">{pdf.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{pdf.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>by <span className="font-medium text-foreground">{u.name}</span></span>
            <span>{pdf.date}</span>
            <Stars value={pdf.rating} />
            <span>({pdf.ratingCount})</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
