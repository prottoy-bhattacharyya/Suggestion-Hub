import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import { NoteCard, type Note } from "@/components/PdfCard";
import api from "@/lib/api";

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

  // Reusable checkbox filter group
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

  if (authStatus === "checking") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">
          Checking your login...
        </p>
      </div>
    );
  }

  if (authStatus === "unauthenticated") {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="paper-card w-full max-w-sm space-y-4 p-8 text-center">
          <h1 className="text-2xl font-semibold">
            Please log in first
          </h1>

          <p className="text-sm text-muted-foreground">
            You need to be logged in to access your Suggestion Hub feed.
          </p>

          <Link
            to="/login"
            className="btn-primary block w-full text-center"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">

        {/* Main feed */}
        <main className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl">
                Good day, {currentUser.full_name.split(" ")[0]}
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                Notes and suggestions shared by your university community.
              </p>
            </div>

            <button
              type="button"
              onClick={clearFilters}
              className="btn-ghost text-sm"
            >
              Clear filters
            </button>
          </div>

          {error && (
            <div
              className="mt-4 rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-500"
              role="alert"
            >
              {error}
            </div>
          )}

          <div className="mt-6 mb-4 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowFilters((previous) => !previous)}
              className="btn-ghost text-sm lg:hidden"
            >
              Filters ({activeFilterCount})
            </button>
          </div>

          <div className="space-y-4">
            {notesLoading ? (
              <p className="py-10 text-center text-muted-foreground">
                Loading notes...
              </p>
            ) : (
              <>
                {filteredNotes.slice(0, shown).map((note) => (
                  <div key={note.id} className="space-y-2">
                    <NoteCard note={note} />
                  </div>
                ))}

                {!filteredNotes.length && (
                  <p className="py-10 text-center text-muted-foreground">
                    No notes match these filters.
                  </p>
                )}
              </>
            )}
          </div>

          {!notesLoading && shown < filteredNotes.length && (
            <button
              type="button"
              onClick={() => setShown((previous) => previous + 4)}
              className="btn-ghost mt-6 w-full"
            >
              Load more
            </button>
          )}
        </main>

        {/* Right-side filters */}
        <aside
          className={`paper-card p-4 ${
            showFilters ? "block" : "hidden"
          } lg:sticky lg:top-24 lg:block`}
        >
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Filters</h2>

            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-primary hover:underline"
            >
              Clear all
            </button>
          </div>

          {/* Upload sorting */}
          <div className="border-b border-border py-4">
            <h3 className="mb-3 text-sm font-semibold">
              Upload date
            </h3>

            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="sortOrder"
                  checked={sortOrder === "newest"}
                  onChange={() => setSortOrder("newest")}
                  className="h-4 w-4 accent-primary"
                />
                Newest uploads
              </label>

              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="sortOrder"
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

          <p className="mt-3 text-xs text-muted-foreground">
            {activeFilterCount} filter option(s) selected
          </p>
        </aside>
      </div>
    </div>
  );
}