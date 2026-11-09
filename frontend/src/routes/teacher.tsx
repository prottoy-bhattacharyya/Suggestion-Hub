import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Eye,
  RefreshCw,
  SlidersHorizontal,
  X,
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
          (note: ReviewNote) => note.review_status === "pending"
        )
      );

      setLog(logsData.review_logs || []);
    } catch (err: any) {
      console.error("Review data error:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load review data. Please try again."
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
    [queue]
  );

  const types = useMemo(
    () =>
      [...new Set(queue.map((note) => note.type).filter(Boolean))].sort(),
    [queue]
  );

  const intakes = useMemo(
    () =>
      [...new Set(queue.map((note) => note.intake).filter(Boolean))].sort(),
    [queue]
  );

  const sections = useMemo(
    () =>
      [...new Set(queue.map((note) => note.section).filter(Boolean))].sort(),
    [queue]
  );

  // Apply filters and sorting
  const filteredQueue = useMemo(() => {
    const filtered = queue.filter((note) => {
      const courseMatch =
        selectedCourses.length === 0 ||
        selectedCourses.includes(note.course_code);

      const typeMatch =
        selectedTypes.length === 0 ||
        selectedTypes.includes(note.type);

      const intakeMatch =
        selectedIntakes.length === 0 ||
        selectedIntakes.includes(note.intake);

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
  const toggleFilter = (
    value: string,
    selected: string[],
    setSelected: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setSelected((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

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

  // Claim note
  const claimNote = (noteId: number) => {
    setClaimed((prev) => ({
      ...prev,
      [noteId]: true,
    }));
  };

  // Open decision form
  const openDecisionForm = (
    noteId: number,
    selectedDecision: Decision
  ) => {
    setActiveNote(noteId);
    setDecision(selectedDecision);
    setComment(
      selectedDecision === "rejected" ? "Reason for rejection: " : ""
    );
  };

  // Submit review
  const submitReview = async (
    noteId: number,
    selectedDecision: Decision,
    reviewComment: string
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
        }
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
          "Failed to submit review. Please try again."
      );
    } finally {
      setSubmitting(null);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleString();

  const getDecisionStyle = (value: string) => {
    switch (value.toLowerCase()) {
      case "approval":
      case "approved":
        return "text-success";

      case "rejection":
      case "rejected":
        return "text-destructive";

      default:
        return "text-warning";
    }
  };

  // Reusable filter group
  const FilterGroup = ({
    title,
    options,
    selected,
    setSelected,
  }: {
    title: string;
    options: string[];
    selected: string[];
    setSelected: React.Dispatch<React.SetStateAction<string[]>>;
  }) => (
    <div className="border-b border-border py-4 last:border-0">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>

      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No options available
        </p>
      ) : (
        <div className="max-h-40 space-y-2 overflow-y-auto">
          {options.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() =>
                  toggleFilter(option, selected, setSelected)
                }
                className="h-4 w-4 accent-primary"
              />

              <span>{option}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl">Review queue</h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Review submitted notes and manage their approval status.
          </p>
        </div>

        <button
          onClick={fetchReviewData}
          disabled={loading}
          className="btn-ghost flex items-center gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-5 flex items-start justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <span>{error}</span>

          <button
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Pending queue and right-side filters */}
      <div
        className={`mt-6 grid grid-cols-1 items-start gap-6 ${
          showFilters
            ? "lg:grid-cols-[minmax(0,1fr)_280px]"
            : "lg:grid-cols-1"
        }`}
      >
        {/* Pending notes */}
        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">
                Pending notes
              </h2>

              <p className="text-sm text-muted-foreground">
                Showing {filteredQueue.length} of {queue.length} pending notes
              </p>
            </div>

            {/* Filter toggle button */}
            <button
              type="button"
              onClick={() => setShowFilters((prev) => !prev)}
              aria-expanded={showFilters}
              aria-controls="teacher-filters"
              className={`btn-ghost flex items-center gap-2 ${
                showFilters ? "bg-accent" : ""
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />

              {showFilters ? "Hide filters" : "Filters"}

              {activeFilterCount > 0 && (
                <span className="chip">{activeFilterCount}</span>
              )}
            </button>
          </div>

          {loading ? (
            <p className="py-10 text-center text-muted-foreground">
              Loading review queue...
            </p>
          ) : filteredQueue.length === 0 ? (
            <p className="paper-card py-10 text-center text-muted-foreground">
              {queue.length === 0
                ? "Queue is clear. No pending notes to review."
                : "No notes match your selected filters."}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredQueue.map((note) => {
                const isClaimed = claimed[note.id];

                return (
                  <div key={note.id} className="paper-card p-5">
                    <div className="flex flex-wrap items-start gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-2">
                          <span className="chip bg-accent">
                            {note.course_code}
                          </span>

                          <span className="chip bg-secondary">
                            {note.type}
                          </span>

                          <span className="chip bg-warning/15 text-warning">
                            Pending
                          </span>

                          {isClaimed && (
                            <span className="chip bg-highlight/25">
                              Claimed by you
                            </span>
                          )}
                        </div>

                        <h3 className="mt-2 text-lg font-semibold">
                          {note.title}
                        </h3>

                        {note.description && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {note.description}
                          </p>
                        )}

                        <p className="mt-2 text-sm text-muted-foreground">
                          Uploaded by {note.uploader_name}
                        </p>

                        <p className="text-sm text-muted-foreground">
                          Intake {note.intake} · Section {note.section}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          Submitted: {formatDate(note.created_at)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          to="/pdf/$id"
                          params={{ id: String(note.id) }}
                          className="btn-ghost flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Preview
                        </Link>

                        {!isClaimed && (
                          <button
                            onClick={() => claimNote(note.id)}
                            className="btn-ghost"
                          >
                            Claim
                          </button>
                        )}

                        {isClaimed && (
                          <>
                            <button
                              onClick={() =>
                                openDecisionForm(note.id, "approved")
                              }
                              className="btn-primary"
                            >
                              Approve
                            </button>

                            <button
                              onClick={() =>
                                openDecisionForm(note.id, "rejected")
                              }
                              className="btn-ghost text-destructive"
                            >
                              Reject
                            </button>

                            <button
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
                        className="mt-5 space-y-3 border-t border-border pt-4"
                        onSubmit={(e) => {
                          e.preventDefault();
                          submitReview(note.id, decision, comment);
                        }}
                      >
                        <div>
                          <label className="mb-1 block text-sm font-medium">
                            Review decision
                          </label>

                          <select
                            className="field w-full"
                            value={decision}
                            onChange={(e) =>
                              setDecision(e.target.value as Decision)
                            }
                          >
                            <option value="approved">Approve</option>
                            <option value="rejected">Reject</option>
                            <option value="pending">Keep pending</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-medium">
                            Comment{" "}
                            {decision === "rejected" && (
                              <span className="text-destructive">*</span>
                            )}
                          </label>

                          <textarea
                            className="field min-h-24 w-full"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder={
                              decision === "rejected"
                                ? "Explain why this note is being rejected..."
                                : "Add a review comment (optional)..."
                            }
                            required={decision === "rejected"}
                          />
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="submit"
                            disabled={
                              submitting === note.id ||
                              (decision === "rejected" && !comment.trim())
                            }
                            className="btn-primary"
                          >
                            {submitting === note.id
                              ? "Submitting..."
                              : "Submit review"}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveNote(null);
                              setComment("");
                            }}
                            className="btn-ghost"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right-side filter panel */}
        {showFilters && (
          <aside
            id="teacher-filters"
            className="paper-card w-full p-4 lg:sticky lg:top-6"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                <h2 className="font-semibold">Filters</h2>
              </div>

              <button
                type="button"
                onClick={() => setShowFilters(false)}
                aria-label="Close filters"
                className="rounded-md p-1 hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-muted-foreground">
                {activeFilterCount} selected
              </span>

              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-primary hover:underline"
              >
                Clear all
              </button>
            </div>

            {/* Sorting */}
            <div className="border-b border-border py-4">
              <h3 className="mb-3 text-sm font-semibold">
                Upload date
              </h3>

              <div className="space-y-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="upload-date"
                    checked={sortOrder === "newest"}
                    onChange={() => setSortOrder("newest")}
                    className="h-4 w-4 accent-primary"
                  />
                  Newest uploads
                </label>

                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="upload-date"
                    checked={sortOrder === "oldest"}
                    onChange={() => setSortOrder("oldest")}
                    className="h-4 w-4 accent-primary"
                  />
                  Oldest uploads
                </label>
              </div>
            </div>

            <FilterGroup
              title="Course"
              options={courses}
              selected={selectedCourses}
              setSelected={setSelectedCourses}
            />

            <FilterGroup
              title="Type"
              options={types}
              selected={selectedTypes}
              setSelected={setSelectedTypes}
            />

            <FilterGroup
              title="Intake"
              options={intakes}
              selected={selectedIntakes}
              setSelected={setSelectedIntakes}
            />

            <FilterGroup
              title="Section"
              options={sections}
              selected={selectedSections}
              setSelected={setSelectedSections}
            />
          </aside>
        )}
      </div>

      {/* Previous reviews */}
      <h2 className="mt-12 text-xl font-semibold">
        Previous reviews
      </h2>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-3">Note</th>
              <th>Course</th>
              <th>Decision</th>
              <th>Comment</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>
            {log.map((item) => (
              <tr key={item.id} className="border-t border-border">
                <td className="py-3">
                  <Link
                    to="/pdf/$id"
                    params={{ id: String(item.note_id) }}
                    className="font-medium hover:text-primary"
                  >
                    {item.note_title}
                  </Link>
                </td>

                <td>{item.course_code}</td>

                <td
                  className={`capitalize ${getDecisionStyle(item.decision)}`}
                >
                  {item.decision}
                </td>

                <td>{item.comment || "—"}</td>

                <td className="whitespace-nowrap">
                  {formatDate(item.created_at)}
                </td>
              </tr>
            ))}

            {!loading && log.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="py-8 text-center text-muted-foreground"
                >
                  No previous reviews.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}