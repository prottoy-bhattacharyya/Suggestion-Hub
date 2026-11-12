import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import { NoteCard, type Note } from "@/components/PdfCard";
import api from "@/lib/api";
import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Check,
  FileText,
  Layers,
  Lock,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";

export const Route = createFileRoute("/feeds")({
  head: () => ({
    meta: [
      { title: "Your feed — Suggestion Hub" },
      {
        name: "description",
        content: "Approved notes and suggestions for your courses.",
      },
    ],
  }),
  component: Feed,
});

type AuthStatus = "checking" | "authenticated" | "unauthenticated";
type SortOrder = "newest" | "oldest";

type CurrentUser = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  department_id?: number;
  student_id?: string;
  intake?: string;
  section?: string;
};

type FeedNote = Note & {
  course_code: string;
  intake: string;
  section: string;
  type: string;
  rating_avg: string | number;
  rating_count: number;
  created_at: string;
  uploader_name: string;
  file_url: string;
  file_type?: "pdf" | "video";
};

type NotesResponse = {
  status: string;
  message?: string;
  notes: FeedNote[];
};

function Feed() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [error, setError] = useState("");
  const [notes, setNotes] = useState<FeedNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);

  // Filter state
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedIntakes, setSelectedIntakes] = useState<string[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  const [shown, setShown] = useState(4);
  const [showFilters, setShowFilters] = useState(true);

  // Check Django session
  useEffect(() => {
    let active = true;

    async function checkLogin() {
      try {
        const response = await api.get("/accounts/me/", {
          headers: {
            Accept: "application/json",
          },
        });

        if (!active) return;

        const loggedIn = Boolean(
          response.data.loggedIn ?? response.data.logedIn,
        );

        if (loggedIn && response.data.user) {
          setCurrentUser(response.data.user);
          setAuthStatus("authenticated");
        } else {
          setCurrentUser(null);
          setAuthStatus("unauthenticated");
        }
      } catch (err) {
        console.error("Login check failed:", err);

        if (active) {
          setCurrentUser(null);
          setAuthStatus("unauthenticated");
        }
      }
    }

    void checkLogin();

    return () => {
      active = false;
    };
  }, []);

  // Fetch feed notes after authentication
  useEffect(() => {
    if (authStatus !== "authenticated") return;

    let active = true;

    async function fetchFeed() {
      try {
        setNotesLoading(true);
        setError("");

        const response = await api.get<NotesResponse>(
          "/feeds/get_feeds/",
          {
            headers: {
              Accept: "application/json",
            },
          },
        );

        if (!active) return;

        if (response.data.status === "success") {
          setNotes(response.data.notes ?? []);
        } else {
          setError("Could not load the feed.");
        }
      } catch (err) {
        console.error("Feed loading failed:", err);

        if (active) {
          setError(
            axios.isAxiosError(err)
              ? err.response?.data?.error ??
                  err.response?.data?.detail ??
                  "Could not load notes. Please check the feed API endpoint."
              : "An unexpected error occurred while loading notes.",
          );
        }
      } finally {
        if (active) setNotesLoading(false);
      }
    }

    void fetchFeed();

    return () => {
      active = false;
    };
  }, [authStatus]);

  // Generate filter options dynamically from API data
  const courses = useMemo(
    () =>
      [...new Set(notes.map((note) => note.course_code).filter(Boolean))].sort(),
    [notes],
  );

  const types = useMemo(
    () => [...new Set(notes.map((note) => note.type).filter(Boolean))].sort(),
    [notes],
  );

  const intakes = useMemo(
    () => [...new Set(notes.map((note) => note.intake).filter(Boolean))].sort(),
    [notes],
  );

  const sections = useMemo(
    () =>
      [...new Set(notes.map((note) => note.section).filter(Boolean))].sort(
        (a, b) => Number(a) - Number(b),
      ),
    [notes],
  );

  // Apply filters and sorting
  const filteredNotes = useMemo(() => {
    const filtered = notes.filter((note) => {
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

    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();

      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
  }, [
    notes,
    selectedCourses,
    selectedTypes,
    selectedIntakes,
    selectedSections,
    sortOrder,
  ]);

  // Reset visible note count when filters change
  useEffect(() => {
    setShown(4);
  }, [
    selectedCourses,
    selectedTypes,
    selectedIntakes,
    selectedSections,
    sortOrder,
  ]);

  const toggleFilter = (
    value: string,
    selected: string[],
    setSelected: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    setSelected((previous) =>
      previous.includes(value)
        ? previous.filter((item) => item !== value)
        : [...previous, value],
    );
  };

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

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  const activeChips: { label: string; remove: () => void }[] = [
    ...selectedCourses.map((v) => ({ label: v, remove: () => toggleFilter(v, selectedCourses, setSelectedCourses) })),
    ...selectedTypes.map((v) => ({ label: v, remove: () => toggleFilter(v, selectedTypes, setSelectedTypes) })),
    ...selectedIntakes.map((v) => ({ label: `Intake ${v}`, remove: () => toggleFilter(v, selectedIntakes, setSelectedIntakes) })),
    ...selectedSections.map((v) => ({ label: `Section ${v}`, remove: () => toggleFilter(v, selectedSections, setSelectedSections) })),
  ];

  // Reusable pill-style filter group
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
    <section className="border-t border-border/60 pt-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </h3>
        {selected.length > 0 && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            {selected.length}
          </span>
        )}
      </div>

      {options.length === 0 ? (
        <p className="text-xs italic text-muted-foreground/70">No options yet</p>
      ) : (
        <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto pr-1">
          {options.map((option) => {
            const active = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                onClick={() => toggleFilter(option, selected, setSelected)}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 ${
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-background/60 text-foreground/80 hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {active && <Check className="h-3 w-3" />}
                {option}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );

  if (authStatus === "checking") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Verifying session
        </p>
      </div>
    );
  }

  if (authStatus === "unauthenticated") {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border/60 bg-card p-10 text-center shadow-2xl shadow-primary/5">
          <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="relative text-3xl font-semibold tracking-tight">Members only</h1>
          <p className="relative mt-3 text-sm leading-relaxed text-muted-foreground">
            Sign in to unlock curated notes and suggestions from your university community.
          </p>
          <Link
            to="/login"
            className="btn-primary relative mt-8 block w-full rounded-xl py-3 text-center font-medium shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5"
          >
            Continue to login
          </Link>
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  const firstName = currentUser.full_name.split(" ")[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      {/* Hero header */}
      <header className="relative mb-10 overflow-hidden rounded-3xl border border-border/60 bg-card px-6 py-8 sm:px-10 sm:py-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              <Sparkles className="h-3 w-3" /> Your feed
            </span>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              {greeting}, <span className="text-primary">{firstName}</span>
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
              Hand-picked notes and suggestions, shared by your university community.
            </p>
          </div>

          <dl className="flex gap-8">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Notes</dt>
              <dd className="mt-1 text-3xl font-semibold tabular-nums">{notes.length}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Courses</dt>
              <dd className="mt-1 text-3xl font-semibold tabular-nums">{courses.length}</dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Main feed */}
        <main className="min-w-0">
          {error && (
            <div
              className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Toolbar */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{Math.min(shown, filteredNotes.length)}</span> of{" "}
              <span className="font-semibold text-foreground">{filteredNotes.length}</span>
            </p>
            <button
              type="button"
              onClick={() => setShowFilters((previous) => !previous)}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {activeChips.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {activeChips.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={chip.remove}
                  className="group inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
                >
                  {chip.label}
                  <X className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                </button>
              ))}
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Clear all
              </button>
            </div>
          )}

          <div className="space-y-4">
            {notesLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-border/60 bg-card p-6">
                  <div className="h-4 w-1/3 rounded bg-muted" />
                  <div className="mt-4 h-3 w-2/3 rounded bg-muted" />
                  <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
                </div>
              ))
            ) : (
              <>
                {filteredNotes.slice(0, shown).map((note, i) => (
                  <div
                    key={note.id}
                    className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both transition-transform duration-300 hover:-translate-y-0.5"
                    style={{ animationDelay: `${(i % 4) * 60}ms` }}
                  >
                    <NoteCard note={note} />
                  </div>
                ))}

                {!filteredNotes.length && (
                  <div className="flex flex-col items-center rounded-3xl border border-dashed border-border py-16 text-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                      <FileText className="h-5 w-5" />
                    </div>
                    <p className="font-medium">Nothing here yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Try loosening your filters to discover more notes.
                    </p>
                    {activeFilterCount > 0 && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="mt-5 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                      >
                        Reset filters
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {!notesLoading && shown < filteredNotes.length && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => setShown((previous) => previous + 4)}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-2.5 text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <Layers className="h-4 w-4" />
                Load more · {filteredNotes.length - shown} left
              </button>
            </div>
          )}
        </main>

        {/* Right-side filters */}
        <aside
          className={`${showFilters ? "block" : "hidden"} space-y-5 rounded-3xl border border-border/60 bg-card/80 p-6 shadow-xl shadow-primary/5 backdrop-blur lg:sticky lg:top-24 lg:block`}
        >
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              Refine
            </h2>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-medium text-primary hover:underline"
              >
                Reset
              </button>
            )}
          </div>

          {/* Sort segmented control */}
          <section>
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Upload date
            </h3>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
              {([
                { value: "newest", label: "Newest", Icon: ArrowDownWideNarrow },
                { value: "oldest", label: "Oldest", Icon: ArrowUpWideNarrow },
              ] as const).map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={sortOrder === value}
                  onClick={() => setSortOrder(value)}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all ${
                    sortOrder === value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </section>

          <FilterGroup title="Course" options={courses} selected={selectedCourses} setSelected={setSelectedCourses} />
          <FilterGroup title="Type" options={types} selected={selectedTypes} setSelected={setSelectedTypes} />
          <FilterGroup title="Intake" options={intakes} selected={selectedIntakes} setSelected={setSelectedIntakes} />
          <FilterGroup title="Section" options={sections} selected={selectedSections} setSelected={setSelectedSections} />
        </aside>
      </div>
    </div>
  );
}