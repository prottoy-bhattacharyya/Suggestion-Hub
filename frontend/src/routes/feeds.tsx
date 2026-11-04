import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import { NoteCard, type Note } from "@/components/PdfCard";
import api from "@/lib/api";
import { getCSRFToken } from "@/lib/utils";
import { notifyAuthChange } from "@/lib/auth";

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

type NotesResponse = {
  status: string;
  notes: Note[];
};

function Feed() {
  const nav = useNavigate();

  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);

  const [filters, setFilters] = useState({
    course: "",
    intake: "",
    section: "",
    type: "",
    rating: "0",
  });

  const [shown, setShown] = useState(4);

  // Check the Django session.
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

  // Fetch actual feed notes after authentication.
  useEffect(() => {
    if (authStatus !== "authenticated") return;

    let active = true;

    async function fetchFeed() {
      try {
        setNotesLoading(true);
        setError("");

        // Replace this with your actual Django feed endpoint.
        const response = await api.get<NotesResponse>("/notes/get_feed/", {
          headers: {
            Accept: "application/json",
          },
        });

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

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const rating = Number(note.rating_avg ?? 0);

      return (
        (!filters.intake || note.intake === filters.intake) &&
        (!filters.section || note.section === filters.section) &&
        (!filters.type || note.type === filters.type) &&
        rating >= Number(filters.rating)
      );
    });
  }, [notes, filters]);

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

  const sel = (
    key: keyof typeof filters,
    options: [string, string][],
  ) => (
    <select
      className="field w-full"
      value={filters[key]}
      onChange={(event) => {
        setFilters((previous) => ({
          ...previous,
          [key]: event.target.value,
        }));
        setShown(4);
      }}
    >
      {options.map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[240px_1fr]">
      <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
        <h2 className="text-lg font-semibold">Filters</h2>

        {sel("course", [
          ["", "All courses"],
        ])}

        {sel("intake", [
          ["", "All intakes"],
          ["48", "Intake 48"],
          ["49", "Intake 49"],
          ["52", "Intake 52"],
        ])}

        {sel("section", [
          ["", "All sections"],
          ["1", "Section 1"],
          ["2", "Section 2"],
          ["3", "Section 3"],
          ["4", "Section 4"],
          ["5", "Section 5"],
        ])}

        {sel("type", [
          ["", "Notes & suggestions"],
          ["note", "Notes"],
          ["suggestion", "Suggestions"],
        ])}

        {sel("rating", [
          ["0", "Any rating"],
          ["4", "4★ and up"],
          ["4.5", "4.5★ and up"],
        ])}
      </aside>

      <main>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl">
              Good day, {currentUser.full_name.split(" ")[0]}
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Notes and suggestions shared by your university community.
            </p>
          </div>
        </div>

        {error && (
          <div
            className="mt-4 rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-500"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="mt-6 space-y-3">
          {notesLoading ? (
            <p className="py-10 text-center text-muted-foreground">
              Loading notes...
            </p>
          ) : (
            <>
              {filteredNotes.slice(0, shown).map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}

              {!filteredNotes.length && (
                <p className="py-10 text-center text-muted-foreground">
                  No notes match these filters.
                </p>
              )}
            </>
          )}
        </div>

        {shown < filteredNotes.length && (
          <button
            type="button"
            onClick={() => setShown((previous) => previous + 4)}
            className="btn-ghost mt-6 w-full"
          >
            Load more
          </button>
        )}
      </main>
    </div>
  );
}