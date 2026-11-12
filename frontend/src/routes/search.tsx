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
  Hash,
  Brain,
  UserPlus,
  UserCheck,
  CalendarDays,
  X,
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
  file_type?: "pdf" | "video";
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

  const modes = [
    { key: "keyword" as const, label: "Keyword", Icon: Hash, hint: "Exact words in titles, courses and descriptions" },
    // { key: "semantic" as const, label: "By meaning", Icon: Brain, hint: "Finds notes about the same idea, even with different words" },
    // { key: "ai" as const, label: "Ask AI", Icon: Sparkles, hint: "Get an answer drawn from approved notes" },
    { key: "people" as const, label: "People", Icon: Users, hint: "Students and teachers in your university" },
  ];
  const activeMode = modes.find((m) => m.key === mode)!;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card px-6 py-10 shadow-xl shadow-primary/5 sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            <Search className="h-3 w-3" /> Discover
          </span>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Find what you <span className="text-primary">need</span>
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
            Course materials, people and answers — all in one place.
          </p>

          {/* Mode switcher */}
          <div className="mt-8 grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1 sm:inline-grid sm:grid-cols-4">
            {modes.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                aria-pressed={mode === key}
                onClick={() => changeMode(key)}
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                  mode === key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`h-4 w-4 ${mode === key ? "text-primary" : ""}`} />
                {label}
              </button>
            ))}
          </div>

          {/* Search input */}
          <div className="group relative mt-4">
            <div className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary">
              {mode === "people" ? <Users size={20} /> : mode === "ai" ? <Sparkles size={20} /> : <Search size={20} />}
            </div>
            <input
              autoFocus
              className="w-full rounded-2xl border border-border bg-background py-4 pl-14 pr-14 text-base shadow-sm outline-none transition-all placeholder:text-muted-foreground/70 focus:border-primary/50 focus:shadow-lg focus:shadow-primary/10 focus:ring-4 focus:ring-primary/10"
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
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              {keywordLoading || peopleLoading ? (
                <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
              ) : q ? (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  aria-label="Clear search"
                  className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{activeMode.hint}</p>
        </div>
      </section>

      {/* Keyword PDF search */}
      {mode === "keyword" && (
        <div className="mt-8 space-y-3">
          {!q.trim() && <EmptyState icon={<Hash className="h-5 w-5" />} text="Search notes by title, course, or description." />}

          {keywordLoading && <SkeletonList />}

          {keywordError && <ErrorBox>{keywordError}</ErrorBox>}

          {!keywordLoading && !keywordError && q.trim() && keywordNotes.length === 0 && (
            <EmptyState icon={<FileText className="h-5 w-5" />} text="No notes found. Try another keyword." />
          )}

          {!keywordLoading && !keywordError && keywordNotes.length > 0 && (
            <ResultCount count={keywordNotes.length} noun="note" />
          )}

          {!keywordLoading &&
            !keywordError &&
            keywordNotes.map((note, i) => (
              <Reveal key={note.id} index={i}>
                <KeywordNoteCard note={note} />
              </Reveal>
            ))}
        </div>
      )}

      {/* People search */}
      {mode === "people" && (
        <div className="mt-8 space-y-3">
          {!q.trim() && <EmptyState icon={<Users className="h-5 w-5" />} text="Search for students and teachers in your university." />}

          {q.trim().length === 1 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Enter at least 2 characters to search.</p>
          )}

          {peopleLoading && <SkeletonList />}

          {peopleError && <ErrorBox>{peopleError}</ErrorBox>}

          {!peopleLoading && !peopleError && q.trim().length >= 2 && people.length === 0 && (
            <EmptyState icon={<Users className="h-5 w-5" />} text="No people found. Try another name or email." />
          )}

          {followError && <ErrorBox>{followError}</ErrorBox>}

          {!peopleLoading && people.length > 0 && <ResultCount count={people.length} noun="person" plural="people" />}

          {!peopleLoading && people.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {people.map((person, i) => {
                const initials = person.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                const pending = followPendingId === person.id;
                return (
                  <Reveal key={person.id} index={i}>
                    <div className="group flex h-full flex-col rounded-2xl border border-border/60 bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                      <div className="flex items-start gap-4">
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary font-display text-base text-primary-foreground shadow-md shadow-primary/20">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link
                            to="/profile/$id"
                            params={{ id: String(person.id) }}
                            className="block truncate font-semibold tracking-tight hover:text-primary"
                          >
                            {person.name}
                          </Link>
                          {(person.designation || person.accountType) && (
                            <span className="mt-1 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                              {person.designation || person.accountType}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                        {person.email && (
                          <p className="flex items-center gap-2 truncate">
                            <Mail size={13} className="shrink-0" /> {person.email}
                          </p>
                        )}
                        {person.department && (
                          <p className="flex items-center gap-2 truncate">
                            <Building2 size={13} className="shrink-0" /> {person.department}
                          </p>
                        )}
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/60 pt-4">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-display text-base font-semibold tabular-nums text-foreground">{person.followers}</span>{" "}
                          follower{person.followers === 1 ? "" : "s"}
                        </p>
                        <button
                          type="button"
                          onClick={() => toggleFollow(person)}
                          disabled={pending}
                          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-all disabled:opacity-50 ${
                            person.is_following
                              ? "border border-border bg-background hover:bg-muted"
                              : "bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:-translate-y-0.5"
                          }`}
                        >
                          {pending ? (
                            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                          ) : person.is_following ? (
                            <UserCheck className="h-3.5 w-3.5" />
                          ) : (
                            <UserPlus className="h-3.5 w-3.5" />
                          )}
                          {person.is_following ? "Following" : "Follow"}
                        </button>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* AI search */}
      {mode === "ai" && !q && (
        <div className="mt-8">
          <EmptyState icon={<Sparkles className="h-5 w-5" />} text="Ask a question and get an answer drawn from approved notes." />
        </div>
      )}
      {mode === "ai" && q && (
        <div className="animate-in fade-in slide-in-from-bottom-2 relative mt-8 overflow-hidden rounded-3xl border border-primary/20 bg-card p-6 shadow-xl shadow-primary/5 sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              Answer from approved notes
            </span>
          </div>

          <p className="relative mt-5 text-base leading-relaxed">
            An LR rotation fixes a left-right imbalance: first rotate the left child to the left, then rotate the
            unbalanced node to the right. The result restores the AVL height property.
          </p>

          <div className="relative mt-6 border-t border-border/60 pt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Sources</p>
            <Link
              to="/pdf/$id"
              params={{ id: "p1" }}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/40 hover:text-primary"
            >
              <FileText className="h-3.5 w-3.5" /> AVL Trees — p. 6
            </Link>
          </div>
        </div>
      )}

      {/* Semantic PDF search — still using existing mock data */}
      {mode === "semantic" && (
        <div className="mt-8 space-y-4">
          {!q.trim() && <EmptyState icon={<Brain className="h-5 w-5" />} text="Search for notes with similar meaning." />}

          {semanticResults.length > 0 && <ResultCount count={semanticResults.length} noun="match" plural="matches" />}

          {semanticResults.map((pdf, index) => (
            <Reveal key={pdf.id} index={index}>
              <p className="mb-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-primary">
                <Sparkles className="h-3 w-3" /> Best match on page {(index % 5) + 2}
              </p>
              <PdfCard pdf={pdf} />
            </Reveal>
          ))}

          {q.trim() && semanticResults.length === 0 && (
            <EmptyState icon={<Brain className="h-5 w-5" />} text="No results found." />
          )}
        </div>
      )}
    </div>
  );
}

function Reveal({ index, children }: { index: number; children: ReactNode }) {
  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
      style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}
    >
      {children}
    </div>
  );
}

function EmptyState({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-border py-14 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">{icon}</div>
      <p className="max-w-xs text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
      {children}
    </div>
  );
}

function ResultCount({ count, noun, plural }: { count: number; noun: string; plural?: string }) {
  return (
    <p className="text-sm text-muted-foreground">
      <span className="font-semibold text-foreground">{count}</span>{" "}
      {count === 1 ? noun : plural ?? `${noun}s`} found
    </p>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-border/60 bg-card p-6">
          <div className="flex gap-4">
            <div className="h-12 w-12 rounded-xl bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded bg-muted" />
              <div className="h-3 w-2/3 rounded bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Card for a note returned by the keyword search API.
function KeywordNoteCard({ note }: { note: SearchNote }) {
  const rating = Number(note.rating_avg);
  const date = note.approved_at
    ? new Date(note.approved_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : null;

  return (
    <article className="group rounded-2xl border border-border/60 bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="grid h-14 w-11 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-md shadow-primary/20">
          <FileText className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {note.course_code && (
              <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                {note.course_code}
              </span>
            )}
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-secondary-foreground">
              {note.type}
            </span>
            <span className="text-xs text-muted-foreground">
              Intake {note.intake} · Section {note.section}
            </span>
          </div>

          <h2 className="font-display text-lg font-semibold leading-snug tracking-tight">{note.title}</h2>

          {note.description && (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{note.description}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                By{" "}
                <Link
                  to="/profile/$id"
                  params={{ id: String(note.author_id) }}
                  className="font-medium text-foreground hover:text-primary"
                >
                  {note.author_name}
                </Link>
              </span>
              {date && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" /> {date}
                </span>
              )}
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
                View PDF <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <p className="text-xs text-destructive">PDF file is not available.</p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}