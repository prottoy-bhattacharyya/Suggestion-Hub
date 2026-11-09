import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  Inbox,
  RefreshCw,
  SearchX,
  SlidersHorizontal,
  X,
  XCircle,
} from "lucide-react";

import api from "@/lib/api";
import { getCSRFToken } from "@/lib/utils";

export const Route = createFileRoute("/teacher")({
  head: () => ({
    meta: [
      { title: "Review queue — Margin" },
      {
        name: "description",
        content: "Approve or reject pending PDFs for your courses.",
      },
      { property: "og:title", content: "Review queue — Margin" },
      { property: "og:description", content: "Teacher review panel." },
    ],
  }),
  component: Teacher,
});

type Decision = "approved" | "rejected" | "pending";
type SortOrder = "newest" | "oldest";

interface ReviewNote {
  id: number;
  title: string;
  description: string;
  course_id: number;
  type: string;
  course_code: string;
  intake: string;
  section: string;
  review_status: string;
  created_at: string;
  uploader_name: string;
}

interface ReviewLog {
  id: number;
  note_id: number;
  decision: string;
  comment: string;
  created_at: string;
  note_title: string;
  course_id: number;
  course_code: string;
}

const DECISION_OPTIONS: {
  value: Decision;
  label: string;
  hint: string;
  icon: typeof CheckCircle2;
  iconClass: string;
  checkedClass: string;
}[] = [
  {
    value: "approved",
    label: "Approve",
    hint: "Publish it for students in the course.",
    icon: CheckCircle2,
    iconClass: "text-success",
    checkedClass: "peer-checked:border-success peer-checked:bg-success/5",
  },
  {
    value: "rejected",
    label: "Reject",
    hint: "Don’t publish it. A reason is required.",
    icon: XCircle,
    iconClass: "text-destructive",
    checkedClass:
      "peer-checked:border-destructive peer-checked:bg-destructive/5",
  },
  {
    value: "pending",
    label: "Keep pending",
    hint: "Leave it in the queue for now.",
    icon: Clock,
    iconClass: "text-warning",
    checkedClass: "peer-checked:border-warning peer-checked:bg-warning/5",
  },
];

function timeAgo(date: string) {
  const diffMs = new Date(date).getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  const minutes = Math.round(diffMs / 60000);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");

  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return rtf.format(days, "day");

  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) return rtf.format(months, "month");

  return rtf.format(Math.round(months / 12), "year");
}

const formatDate = (date: string) => new Date(date).toLocaleString();

const formatShortDate = (date: string) =>
  new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function normalizeDecision(value: string): Decision {
  const v = value.toLowerCase();
  if (v.startsWith("approv")) return "approved";
  if (v.startsWith("reject")) return "rejected";
  return "pending";
}

// Defined outside Teacher so it isn't re-created (and remounted) on every render.
function FilterGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset className="border-b border-border py-4 last:border-0">
      <legend className="mb-3 text-sm font-semibold">{title}</legend>

      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground">No options available</p>
      ) : (
        <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
          {options.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1 text-sm hover:bg-secondary/60"
            >
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => onToggle(option)}
                className="h-4 w-4 accent-primary"
              />

              <span className="capitalize">{option}</span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}

function Teacher() {
  const [queue, setQueue] = useState<ReviewNote[]>([]);
  const [log, setLog] = useState<ReviewLog[]>([]);
  const [claimed, setClaimed] = useState<Record<number, boolean>>({});

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [error, setError] = useState("");

  const [activeNote, setActiveNote] = useState<number | null>(null);
  const [decision, setDecision] = useState<Decision>("rejected");
  const [comment, setComment] = useState("");

  // Filter state
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedIntakes, setSelectedIntakes] = useState<string[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  // Filter panel visibility
  const [showFilters, setShowFilters] = useState(false);

  // Fetch review data
  const fetchReviewData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [notesResponse, logsResponse] = await Promise.all([
        api.get("/review/get_notes/"),
        api.get("/review/get_review_logs/"),
      ]);

      const notesData = notesResponse.data;
      const logsData = logsResponse.data;

      if (notesData.status !== "success") {
        throw new Error("Failed to load review queue.");
      }

      if (logsData.status !== "success") {
        throw new Error("Failed to load review history.");
      }

      setQueue(
        (notesData.notes || []).filter(
          (note: ReviewNote) => note.review_status === "pending",
        ),
      );

      setLog(logsData.review_logs || []);
    } catch (err: any) {
      console.error("Review data error:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load review data. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviewData();
  }, [fetchReviewData]);

  // Generate filter options dynamically
  const courses = useMemo(
    () =>
      [...new Set(queue.map((note) => note.course_code).filter(Boolean))].sort(),
    [queue],
  );

  const types = useMemo(
    () => [...new Set(queue.map((note) => note.type).filter(Boolean))].sort(),
    [queue],
  );

  const intakes = useMemo(
    () =>
      [...new Set(queue.map((note) => note.intake).filter(Boolean))].sort(),
    [queue],
  );

  const sections = useMemo(
    () =>
      [...new Set(queue.map((note) => note.section).filter(Boolean))].sort(),
    [queue],
  );

  // Apply filters and sorting
  const filteredQueue = useMemo(() => {
    const filtered = queue.filter((note) => {
      const courseMatch =
        selectedCourses.length === 0 ||
        selectedCourses.includes(note.course_code);

      const typeMatch =
        selectedTypes.length === 0 || selectedTypes.includes(note.type);

      const intakeMatch =
        selectedIntakes.length === 0 || selectedIntakes.includes(note.intake);

      const sectionMatch =
        selectedSections.length === 0 ||
        selectedSections.includes(note.section);

      return courseMatch && typeMatch && intakeMatch && sectionMatch;
    });

    return filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();

      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
  }, [
    queue,
    selectedCourses,
    selectedTypes,
    selectedIntakes,
    selectedSections,
    sortOrder,
  ]);

  // Toggle checkbox filter
  const toggleIn =
    (setSelected: React.Dispatch<React.SetStateAction<string[]>>) =>
    (value: string) =>
      setSelected((prev) =>
        prev.includes(value)
          ? prev.filter((item) => item !== value)
          : [...prev, value],
      );

  // Clear all filters
  const clearFilters = () => {
    setSelectedCourses([]);
    setSelectedTypes([]);
    setSelectedIntakes([]);
    setSelectedSections([]);
    setSortOrder("newest");
  };

  const activeFilterCount =
    selectedCourses.length +
    selectedTypes.length +
    selectedIntakes.length +
    selectedSections.length;

  // Removable chips for whatever filters are active
  const activeFilters = [
    ...selectedCourses.map((value) => ({
      key: `course-${value}`,
      label: value,
      remove: () => toggleIn(setSelectedCourses)(value),
    })),
    ...selectedTypes.map((value) => ({
      key: `type-${value}`,
      label: value,
      remove: () => toggleIn(setSelectedTypes)(value),
    })),
    ...selectedIntakes.map((value) => ({
      key: `intake-${value}`,
      label: `Intake ${value}`,
      remove: () => toggleIn(setSelectedIntakes)(value),
    })),
    ...selectedSections.map((value) => ({
      key: `section-${value}`,
      label: `Section ${value}`,
      remove: () => toggleIn(setSelectedSections)(value),
    })),
  ];

  // Numbers for the summary strip
  const approvedCount = log.filter(
    (item) => normalizeDecision(item.decision) === "approved",
  ).length;
  const rejectedCount = log.filter(
    (item) => normalizeDecision(item.decision) === "rejected",
  ).length;

  // Claim note
  const claimNote = (noteId: number) => {
    setClaimed((prev) => ({
      ...prev,
      [noteId]: true,
    }));
  };

  // Open decision form
  const openDecisionForm = (noteId: number, selectedDecision: Decision) => {
    setActiveNote(noteId);
    setDecision(selectedDecision);
    setComment(
      selectedDecision === "rejected" ? "Reason for rejection: " : "",
    );
  };

  // Submit review
  const submitReview = async (
    noteId: number,
    selectedDecision: Decision,
    reviewComment: string,
  ) => {
    if (selectedDecision === "rejected" && !reviewComment.trim()) {
      setError("Please provide a reason for rejecting this note.");
      return;
    }

    setSubmitting(noteId);
    setError("");

    try {
      const csrfToken = await getCSRFToken();

      await api.post(
        "/review/submit_review/",
        {
          note_id: noteId,
          decision: selectedDecision,
          comment: reviewComment.trim(),
        },
        {
          headers: {
            "X-CSRFToken": csrfToken,
          },
        },
      );

      setActiveNote(null);
      setComment("");

      setClaimed((prev) => {
        const updated = { ...prev };
        delete updated[noteId];
        return updated;
      });

      await fetchReviewData();
    } catch (err: any) {
      console.error("Review submission error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to submit review. Please try again.",
      );
    } finally {
      setSubmitting(null);
    }
  };

  const decisionPill = (value: string) => {
    const normalized = normalizeDecision(value);

    if (normalized === "approved") {
      return {
        label: "Approved",
        icon: CheckCircle2,
        className: "bg-success/10 text-success",
      };
    }

    if (normalized === "rejected") {
      return {
        label: "Rejected",
        icon: XCircle,
        className: "bg-destructive/10 text-destructive",
      };
    }

    return {
      label: "Pending",
      icon: Clock,
      className: "bg-warning/15 text-warning",
    };
  };

  const stats = [
    { label: "Waiting for review", value: queue.length },
    { label: "Approved", value: approvedCount },
    { label: "Rejected", value: rejectedCount },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <h1 className="text-4xl font-semibold tracking-tight">
            Review queue
          </h1>

          <p className="mt-3 leading-relaxed text-muted-foreground">
            Check submitted notes for accuracy, then approve or reject them.
            Approved notes are published for students in the course.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchReviewData}
          disabled={loading}
          className="btn-ghost inline-flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`}
            aria-hidden="true"
          />
          Refresh
        </button>
      </header>

      {/* Summary */}
      <dl className="paper-card mt-8 grid grid-cols-3 divide-x divide-border">
        {stats.map((stat) => (
          <div key={stat.label} className="px-4 py-5 sm:px-6">
            <dd className="text-3xl font-semibold tabular-nums tracking-tight">
              {loading ? "–" : stat.value}
            </dd>
            <dt className="mt-1 text-xs text-muted-foreground sm:text-sm">
              {stat.label}
            </dt>
          </div>
        ))}
      </dl>

      {/* Error message */}
      {error && (
        <div
          className="mt-5 flex items-start justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          <span className="flex items-start gap-2">
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            {error}
          </span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
            className="rounded p-0.5 hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Pending queue and right-side filters */}
      <div
        className={`mt-10 grid grid-cols-1 items-start gap-8 ${
          showFilters ? "lg:grid-cols-[minmax(0,1fr)_280px]" : "lg:grid-cols-1"
        }`}
      >
        {/* Pending notes */}
        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Pending notes</h2>

              <p className="mt-0.5 text-sm text-muted-foreground">
                {loading
                  ? "Loading…"
                  : `Showing ${filteredQueue.length} of ${queue.length}`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="sort-order" className="sr-only">
                Sort by upload date
              </label>

              <select
                id="sort-order"
                className="field py-2 text-sm"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>

              {/* Filter toggle button */}
              <button
                type="button"
                onClick={() => setShowFilters((prev) => !prev)}
                aria-expanded={showFilters}
                aria-controls="teacher-filters"
                className={`btn-ghost inline-flex items-center gap-2 ${
                  showFilters ? "bg-accent" : ""
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />

                {showFilters ? "Hide filters" : "Filters"}

                {activeFilterCount > 0 && (
                  <span className="chip">{activeFilterCount}</span>
                )}
              </button>
            </div>
          </div>

          {/* Active filters */}
          {activeFilters.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {activeFilters.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={filter.remove}
                  className="chip inline-flex items-center gap-1.5 bg-accent capitalize hover:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  aria-label={`Remove filter ${filter.label}`}
                >
                  {filter.label}
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              ))}

              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-medium text-primary hover:underline"
              >
                Clear all
              </button>
            </div>
          )}

          {loading ? (
            <div className="space-y-3" aria-busy="true" aria-label="Loading review queue">
              {[0, 1, 2].map((i) => (
                <div key={i} className="paper-card animate-pulse p-5 motion-reduce:animate-none">
                  <div className="flex gap-2">
                    <div className="h-5 w-16 rounded-full bg-secondary" />
                    <div className="h-5 w-14 rounded-full bg-secondary" />
                  </div>
                  <div className="mt-4 h-5 w-2/3 rounded bg-secondary" />
                  <div className="mt-3 h-4 w-1/2 rounded bg-secondary" />
                </div>
              ))}
            </div>
          ) : filteredQueue.length === 0 ? (
            <div className="paper-card grid place-items-center px-6 py-16 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                {queue.length === 0 ? (
                  <Inbox className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <SearchX className="h-6 w-6" aria-hidden="true" />
                )}
              </span>

              <p className="mt-4 font-medium">
                {queue.length === 0
                  ? "Queue is clear"
                  : "No notes match these filters"}
              </p>

              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {queue.length === 0
                  ? "There are no pending notes to review right now."
                  : "Try removing a filter to see more notes."}
              </p>

              {queue.length > 0 && activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="btn-ghost mt-5"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQueue.map((note) => {
                const isClaimed = claimed[note.id];

                return (
                  <article
                    key={note.id}
                    className={`paper-card p-5 sm:p-6 ${
                      isClaimed ? "ring-1 ring-primary/40" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-5">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="chip bg-accent">
                            {note.course_code}
                          </span>

                          <span className="chip bg-secondary capitalize">
                            {note.type}
                          </span>

                          {isClaimed && (
                            <span className="chip bg-highlight/25">
                              Claimed by you
                            </span>
                          )}
                        </div>

                        <h3 className="mt-3 text-lg font-semibold leading-snug">
                          {note.title}
                        </h3>

                        {note.description && (
                          <p className="mt-1.5 line-clamp-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
                            {note.description}
                          </p>
                        )}

                        <p className="mt-3 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {note.uploader_name}
                          </span>{" "}
                          for intake {note.intake}, section {note.section}
                        </p>

                        <p
                          className="mt-0.5 text-xs text-muted-foreground"
                          title={formatDate(note.created_at)}
                        >
                          Submitted {timeAgo(note.created_at)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          to="/pdf/$id"
                          params={{ id: String(note.id) }}
                          className="btn-ghost inline-flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                          Preview
                        </Link>

                        {!isClaimed && (
                          <button
                            type="button"
                            onClick={() => claimNote(note.id)}
                            className="btn-primary"
                          >
                            Claim to review
                          </button>
                        )}

                        {isClaimed && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                openDecisionForm(note.id, "approved")
                              }
                              className="btn-primary"
                            >
                              Approve
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openDecisionForm(note.id, "rejected")
                              }
                              className="btn-ghost text-destructive"
                            >
                              Reject
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openDecisionForm(note.id, "pending")
                              }
                              className="btn-ghost"
                            >
                              Keep pending
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Decision form */}
                    {activeNote === note.id && (
                      <form
                        className="mt-6 space-y-5 border-t border-border pt-5"
                        onSubmit={(e) => {
                          e.preventDefault();
                          submitReview(note.id, decision, comment);
                        }}
                      >
                        <fieldset disabled={submitting === note.id}>
                          <legend className="text-sm font-medium">
                            Your decision
                          </legend>

                          <div className="mt-2 grid gap-3 sm:grid-cols-3">
                            {DECISION_OPTIONS.map((option) => {
                              const Icon = option.icon;

                              return (
                                <label
                                  key={option.value}
                                  className="relative block cursor-pointer"
                                >
                                  <input
                                    type="radio"
                                    name={`decision-${note.id}`}
                                    value={option.value}
                                    checked={decision === option.value}
                                    onChange={() => {
                                      setDecision(option.value);
                                      if (
                                        option.value === "rejected" &&
                                        !comment.trim()
                                      ) {
                                        setComment("Reason for rejection: ");
                                      }
                                    }}
                                    className="peer sr-only"
                                  />

                                  <span
                                    className={`block h-full rounded-xl border border-border p-3.5 transition-colors hover:bg-secondary/60 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 ${option.checkedClass}`}
                                  >
                                    <span className="flex items-center gap-2 text-sm font-medium">
                                      <Icon
                                        className={`h-4 w-4 ${option.iconClass}`}
                                        aria-hidden="true"
                                      />
                                      {option.label}
                                    </span>

                                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                                      {option.hint}
                                    </span>
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </fieldset>

                        <div>
                          <label
                            htmlFor={`comment-${note.id}`}
                            className="mb-1 block text-sm font-medium"
                          >
                            Comment{" "}
                            {decision === "rejected" ? (
                              <span className="text-destructive" aria-hidden="true">
                                *
                              </span>
                            ) : (
                              <span className="font-normal text-muted-foreground">
                                (optional)
                              </span>
                            )}
                          </label>

                          <textarea
                            id={`comment-${note.id}`}
                            className="field min-h-24 w-full"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder={
                              decision === "rejected"
                                ? "Explain why this note is being rejected..."
                                : "Add a review comment (optional)..."
                            }
                            required={decision === "rejected"}
                            disabled={submitting === note.id}
                          />
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="submit"
                            disabled={
                              submitting === note.id ||
                              (decision === "rejected" && !comment.trim())
                            }
                            className="btn-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {submitting === note.id
                              ? "Submitting…"
                              : decision === "approved"
                                ? "Approve note"
                                : decision === "rejected"
                                  ? "Reject note"
                                  : "Keep pending"}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveNote(null);
                              setComment("");
                            }}
                            disabled={submitting === note.id}
                            className="btn-ghost"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Right-side filter panel */}
        {showFilters && (
          <aside
            id="teacher-filters"
            className="paper-card w-full p-5 lg:sticky lg:top-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Filters</h2>

              <button
                type="button"
                onClick={() => setShowFilters(false)}
                aria-label="Close filters"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-between pb-1 pt-2">
              <span className="text-xs text-muted-foreground">
                {activeFilterCount} selected
              </span>

              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-medium text-primary hover:underline"
              >
                Clear all
              </button>
            </div>

            <FilterGroup
              title="Course"
              options={courses}
              selected={selectedCourses}
              onToggle={toggleIn(setSelectedCourses)}
            />

            <FilterGroup
              title="Type"
              options={types}
              selected={selectedTypes}
              onToggle={toggleIn(setSelectedTypes)}
            />

            <FilterGroup
              title="Intake"
              options={intakes}
              selected={selectedIntakes}
              onToggle={toggleIn(setSelectedIntakes)}
            />

            <FilterGroup
              title="Section"
              options={sections}
              selected={selectedSections}
              onToggle={toggleIn(setSelectedSections)}
            />
          </aside>
        )}
      </div>

      {/* Previous reviews */}
      <section className="mt-14">
        <h2 className="text-xl font-semibold">Previous reviews</h2>

        <div className="paper-card mt-4 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Note</th>
                <th className="px-3 py-3 font-medium">Course</th>
                <th className="px-3 py-3 font-medium">Decision</th>
                <th className="px-3 py-3 font-medium">Comment</th>
                <th className="px-5 py-3 font-medium">Date</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {log.map((item) => {
                const pill = decisionPill(item.decision);
                const PillIcon = pill.icon;

                return (
                  <tr key={item.id} className="hover:bg-secondary/40">
                    <td className="max-w-[16rem] px-5 py-3.5">
                      <Link
                        to="/pdf/$id"
                        params={{ id: String(item.note_id) }}
                        className="block truncate font-medium hover:text-primary"
                      >
                        {item.note_title}
                      </Link>
                    </td>

                    <td className="px-3 py-3.5">{item.course_code}</td>

                    <td className="px-3 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${pill.className}`}
                      >
                        <PillIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        {pill.label}
                      </span>
                    </td>

                    <td
                      className="max-w-[18rem] truncate px-3 py-3.5 text-muted-foreground"
                      title={item.comment || undefined}
                    >
                      {item.comment || "—"}
                    </td>

                    <td
                      className="whitespace-nowrap px-5 py-3.5 text-muted-foreground"
                      title={formatDate(item.created_at)}
                    >
                      {formatShortDate(item.created_at)}
                    </td>
                  </tr>
                );
              })}

              {!loading && log.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-muted-foreground"
                  >
                    You haven’t reviewed any notes yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}