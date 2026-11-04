import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import {
  Search,
  Sparkles,
  Users,
  Mail,
  Building2,
  LoaderCircle,
  FileText,
  Star,
  ExternalLink,
} from "lucide-react";

import { PdfCard } from "@/components/PdfCard";
import { pdfs } from "@/lib/mock-data";
import api from "@/lib/api";
import { getCSRFToken } from "@/lib/utils";
import axios from "axios";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search — Suggestion Hub" },
      {
        name: "description",
        content:
          "Search notes, people, and get AI assistance over approved notes.",
      },
      { property: "og:title", content: "Search — Suggestion Hub" },
      {
        property: "og:description",
        content: "Find notes and people in your university community.",
      },
    ],
  }),
  component: SearchPage,
});

type SearchMode = "keyword" | "semantic" | "ai" | "people";

type Person = {
  id: number;
  name: string;
  email: string;
  department?: string;
  designation?: string;
  accountType?: string;
  followers: number;
  is_following: boolean;
};

type SearchNote = {
  id: number;
  title: string;
  description: string;
  type: "note" | "suggestion";
  intake: string;
  section: string;
  course_code: string;
  rating_avg: number | string;
  rating_count: number;
  approved_at: string | null;
  author_name: string;
  author_id: number;
  file_url: string;
};

type KeywordSearchResponse = {
  notes: SearchNote[];
};

function SearchPage() {
  const [mode, setMode] = useState<SearchMode>("keyword");
  const [q, setQ] = useState("");

  // Keyword search states
  const [keywordNotes, setKeywordNotes] = useState<SearchNote[]>([]);
  const [keywordLoading, setKeywordLoading] = useState(false);
  const [keywordError, setKeywordError] = useState("");

  // People search states
  const [people, setPeople] = useState<Person[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleError, setPeopleError] = useState("");

  // Follow button states
  const [followPendingId, setFollowPendingId] = useState<number | null>(null);
  const [followError, setFollowError] = useState("");

  // Existing mock data for semantic search
  const approved = pdfs.filter((p) => p.status === "approved");

  const semanticResults = q
    ? approved
        .filter(
          (p) =>
            `${p.title} ${p.description} ${p.course}`
              .toLowerCase()
              .includes(q.toLowerCase()),
        )
        .sort((a, b) => b.rating - a.rating)
    : [];

  // Search PDFs by keyword from Django.
  useEffect(() => {
    if (mode !== "keyword" || !q.trim()) {
      setKeywordNotes([]);
      setKeywordError("");
      setKeywordLoading(false);
      return;
    }

    const controller = new AbortController();

    // Wait briefly before requesting to avoid a request on every keystroke.
    const timeout = setTimeout(async () => {
      try {
        setKeywordLoading(true);
        setKeywordError("");

        const { data } = await api.get<KeywordSearchResponse>(
          "/search/keywords",
          {
            params: {
              q: q.trim(),
            },
            signal: controller.signal,
            headers: {
              Accept: "application/json",
            },
          },
        );

        if (!controller.signal.aborted) {
          setKeywordNotes(
            Array.isArray(data.notes) ? data.notes : [],
          );
        }
      } catch (error: unknown) {
        if (controller.signal.aborted) return;

        console.error("Keyword search failed:", error);

        if (axios.isAxiosError(error)) {
          setKeywordError(
            error.response?.data?.error ??
              error.response?.data?.detail ??
              "Unable to search notes. Please try again.",
          );
        } else {
          setKeywordError("An unexpected error occurred.");
        }

        setKeywordNotes([]);
      } finally {
        if (!controller.signal.aborted) {
          setKeywordLoading(false);
        }
      }
    }, 400);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [mode, q]);

  // Search people from Django.
  useEffect(() => {
    if (mode !== "people" || q.trim().length < 2) {
      setPeople([]);
      setPeopleError("");
      setPeopleLoading(false);
      return;
    }

    const controller = new AbortController();

    const timeout = setTimeout(async () => {
      try {
        setPeopleLoading(true);
        setPeopleError("");

        const response = await api.get("/search/people/", {
          params: {
            q: q.trim(),
          },
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        });

        const data = response.data;

        const userList: unknown[] = Array.isArray(data)
          ? data
          : Array.isArray(data.users)
            ? data.users
            : Array.isArray(data.results)
              ? data.results
              : [];

        const formattedPeople: Person[] = userList.map(
          (item: any) => ({
            id: item.id,
            name:
              item.fullName ??
              item.full_name ??
              item.name ??
              "Unnamed user",
            email: item.email ?? "",
            department:
              item.department?.name ??
              item.department ??
              item.department_name ??
              "",
            designation: item.designation ?? item.role ?? "",
            accountType:
              item.accountType ??
              item.account_type ??
              "",
            followers: item.follower_count ?? 0,
            is_following: Boolean(item.is_following),
          }),
        );

        setPeople(formattedPeople);
        setFollowError("");
      } catch (error: unknown) {
        if (controller.signal.aborted) return;

        console.error("People search failed:", error);

        if (axios.isAxiosError(error)) {
          setPeopleError(
            error.response?.data?.error ??
              error.response?.data?.detail ??
              "Unable to search people. Please try again.",
          );
        } else {
          setPeopleError("An unexpected error occurred.");
        }

        setPeople([]);
      } finally {
        if (!controller.signal.aborted) {
          setPeopleLoading(false);
        }
      }
    }, 400);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [mode, q]);

  // Follow or unfollow a person.
  async function toggleFollow(person: Person) {
    if (followPendingId !== null) return;

    const action = person.is_following ? "unfollow" : "follow";

    setFollowPendingId(person.id);
    setFollowError("");

    try {
      const csrfToken = await getCSRFToken();

      const response = await api.post(
        `/social/follow/${person.id}/`,
        { action },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
          },
        },
      );

      setPeople((prev) =>
        prev.map((p) =>
          p.id === person.id
            ? {
                ...p,
                is_following: Boolean(response.data.is_following),
                followers:
                  response.data.follower_count ?? p.followers,
              }
            : p,
        ),
      );
    } catch (error: unknown) {
      console.error("Follow action failed:", error);

      let message = "Could not update follow. Please try again.";

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          message = "Please login to follow people.";
        } else {
          message =
            error.response?.data?.error ??
            error.response?.data?.detail ??
            message;
        }
      }

      setFollowError(String(message));
    } finally {
      setFollowPendingId(null);
    }
  }

  function changeMode(newMode: SearchMode) {
    setMode(newMode);
    setQ("");
    setKeywordNotes([]);
    setKeywordError("");
    setPeople([]);
    setPeopleError("");
    setFollowError("");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {/* Page heading */}
      <div>
        <h1 className="text-3xl font-semibold">Search</h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Find course materials, people, and answers.
        </p>
      </div>

      {/* Search modes */}
      <div className="mt-5 flex flex-wrap gap-1 rounded-md border border-border bg-card p-1">
        {(
          ["keyword", "semantic", "ai", "people"] as const
        ).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => changeMode(m)}
            className={`rounded px-3 py-2 text-sm transition-colors ${
              mode === m
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m === "keyword"
              ? "Keyword"
              : m === "semantic"
                ? "By meaning"
                : m === "ai"
                  ? "Ask AI"
                  : "People"}
          </button>
        ))}
      </div>

      {/* Search input */}
      <div className="relative mt-4">
        {mode === "people" ? (
          <Users
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={19}
          />
        ) : (
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={19}
          />
        )}

        <input
          className="field w-full py-3 pl-11 text-base"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={
            mode === "ai"
              ? "e.g. How does an LR rotation work?"
              : mode === "people"
                ? "Search by name, email, or department..."
                : "Search titles, courses, descriptions..."
          }
        />
      </div>

      {/* Keyword PDF search */}
      {mode === "keyword" && (
        <div className="mt-6 space-y-3">
          {!q.trim() && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Search notes by title, course, or description.
            </p>
          )}

          {keywordLoading && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <LoaderCircle size={18} className="animate-spin" />
              Searching notes...
            </div>
          )}

          {keywordError && (
            <div
              className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-500"
              role="alert"
            >
              {keywordError}
            </div>
          )}

          {!keywordLoading &&
            !keywordError &&
            q.trim() &&
            keywordNotes.length === 0 && (
              <p className="py-10 text-center text-muted-foreground">
                No notes found. Try another keyword.
              </p>
            )}

          {!keywordLoading &&
            !keywordError &&
            keywordNotes.map((note) => (
              <KeywordNoteCard key={note.id} note={note} />
            ))}
        </div>
      )}

      {/* People search */}
      {mode === "people" && (
        <div className="mt-6 space-y-3">
          {!q.trim() && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Search for students and teachers in your university.
            </p>
          )}

          {q.trim().length === 1 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Enter at least 2 characters to search.
            </p>
          )}

          {peopleLoading && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <LoaderCircle size={18} className="animate-spin" />
              Searching people...
            </div>
          )}

          {peopleError && (
            <div
              className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-500"
              role="alert"
            >
              {peopleError}
            </div>
          )}

          {!peopleLoading &&
            !peopleError &&
            q.trim().length >= 2 &&
            people.length === 0 && (
              <p className="py-10 text-center text-muted-foreground">
                No people found. Try another name or email.
              </p>
            )}

          {!peopleLoading &&
            people.map((person) => (
              <div
                key={person.id}
                className="paper-card flex items-center gap-4 p-4"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-lg font-semibold text-primary">
                  {person.name.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <Link
                    to="/profile/$id"
                    params={{ id: String(person.id) }}
                    className="block truncate font-semibold hover:underline"
                  >
                    {person.name}
                  </Link>

                  {person.email && (
                    <p className="mt-1 flex items-center gap-2 truncate text-sm text-muted-foreground">
                      <Mail size={14} className="shrink-0" />
                      {person.email}
                    </p>
                  )}

                  {person.department && (
                    <p className="mt-1 flex items-center gap-2 truncate text-xs text-muted-foreground">
                      <Building2 size={14} className="shrink-0" />
                      {person.department}
                    </p>
                  )}

                  {(person.designation || person.accountType) && (
                    <p className="mt-1 text-xs text-primary">
                      {person.designation || person.accountType}
                    </p>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <button
                    type="button"
                    onClick={() => toggleFollow(person)}
                    disabled={followPendingId === person.id}
                    className={
                      person.is_following
                        ? "rounded-md border border-border px-4 py-2 text-sm transition-colors hover:bg-secondary disabled:opacity-50"
                        : "rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                    }
                  >
                    {followPendingId === person.id
                      ? "..."
                      : person.is_following
                        ? "Following"
                        : "Follow"}
                  </button>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {person.followers}{" "}
                    {person.followers === 1 ? "follower" : "followers"}
                  </p>
                </div>
              </div>
            ))}

          {followError && (
            <div
              className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-500"
              role="alert"
            >
              {followError}
            </div>
          )}
        </div>
      )}

      {/* AI search */}
      {mode === "ai" && q && (
        <div className="paper-card mt-6 p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4" />
            Answer from approved notes
          </div>

          <p className="mt-3 leading-relaxed">
            An LR rotation fixes a left-right imbalance: first
            rotate the left child to the left, then rotate the
            unbalanced node to the right. The result restores the
            AVL height property.
          </p>

          <div className="mt-4 text-xs text-muted-foreground">
            Sources:{" "}
            <Link
              to="/pdf/$id"
              params={{ id: "p1" }}
              className="text-primary underline"
            >
              AVL Trees — p. 6
            </Link>
          </div>
        </div>
      )}

      {/* Semantic PDF search — still using existing mock data */}
      {mode === "semantic" && (
        <div className="mt-6 space-y-3">
          {!q.trim() && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Search for notes with similar meaning.
            </p>
          )}

          {semanticResults.map((pdf, index) => (
            <div key={pdf.id}>
              <p className="mb-1 text-xs text-muted-foreground">
                Best match on page {(index % 5) + 2}
              </p>
              <PdfCard pdf={pdf} />
            </div>
          ))}

          {q.trim() && semanticResults.length === 0 && (
            <p className="py-10 text-center text-muted-foreground">
              No results found.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Card for a note returned by the keyword search API.
function KeywordNoteCard({ note }: { note: SearchNote }) {
  const rating = Number(note.rating_avg);

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

            {note.course_code && (
              <span className="chip bg-secondary text-secondary-foreground">
                {note.course_code}
              </span>
            )}

            <span className="text-xs text-muted-foreground">
              Intake {note.intake} · Section {note.section}
            </span>
          </div>

          <h2 className="font-display text-lg leading-snug">
            {note.title}
          </h2>

          {note.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {note.description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span>
              By{" "}
              <Link
                to="/profile/$id"
                params={{ id: String(note.author_id) }}
                className="font-medium text-foreground hover:underline"
              >
                {note.author_name}
              </Link>
            </span>

            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-highlight text-highlight" />
              {Number.isFinite(rating) ? rating.toFixed(1) : "0.0"}
            </span>

            <span>
              ({note.rating_count}{" "}
              {note.rating_count === 1 ? "rating" : "ratings"})
            </span>
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
              PDF file is not available.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}