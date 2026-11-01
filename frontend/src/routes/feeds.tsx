import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { LogOut } from "lucide-react";
import axios from "axios";

import { PdfCard } from "@/components/PdfCard";
import { currentUserId, pdfs, userById } from "@/lib/mock-data";
import { getCSRFToken } from "@/lib/utils";
import api from "@/lib/api";
import { setSessionUser } from "@/lib/auth";

export const Route = createFileRoute("/feeds")({
  head: () => ({
    meta: [
      { title: "Your feed — Suggesion Hub" },
      {
        name: "description",
        content: "Approved notes and suggestions for your courses.",
      },
      { property: "og:title", content: "Your feed — Suggesion Hub" },
      {
        property: "og:description",
        content: "Approved notes for your course and intake.",
      },
    ],
  }),
  component: Feed,
});

const following = ["u2"];

type AuthStatus = "checking" | "authenticated" | "unauthenticated";

function Feed() {
  const nav = useNavigate();

  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [error, setError] = useState("");

  const [f, setF] = useState({
    course: "",
    intake: "",
    section: "",
    type: "",
    rating: "0",
  });

  const [shown, setShown] = useState(4);

  // Check whether the user has an active Django session.
  useEffect(() => {
    let active = true;

    async function checkLogin() {
      try {
        const csrfToken = await getCSRFToken();

        const response = await api.get("/accounts/me/", {
          headers: {
            Accept: "application/json",
            ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
          },
        });

        if (!active) return;

        const loggedIn = Boolean(
          response.data.loggedIn ?? response.data.logedIn,
        );

        setAuthStatus(
          loggedIn ? "authenticated" : "unauthenticated",
        );
      } catch (err: unknown) {
        if (!active) return;

        console.error("Login check failed:", err);
        setAuthStatus("unauthenticated");
      }
    }

    void checkLogin();

    return () => {
      active = false;
    };
  }, []);

    // This section is only reached after authentication succeeds.
  const me = userById(currentUserId);

  const list = useMemo(() => {
    const group = (p: (typeof pdfs)[0]) => {
      if (following.includes(p.uploaderId)) return 0;
      if (me.courses.includes(p.course)) return 1;
      if (userById(p.uploaderId).department === me.department) return 2;
      return 3;
    };

    return pdfs
      .filter(
        (p) => p.status === "approved" && p.uploaderId !== me.id,
      )
      .filter(
        (p) =>
          (!f.course || p.course === f.course) &&
          (!f.intake || p.intake === f.intake) &&
          (!f.section || p.section === f.section) &&
          (!f.type || p.type === f.type) &&
          p.rating >= Number(f.rating),
      )
      .sort(
        (a, b) =>
          group(a) - group(b) || b.date.localeCompare(a.date),
      );
  }, [f, me]);

  // Logout the current Django session.
  async function handleLogout() {
    setError("");

    try {
      setLogoutLoading(true);

      const csrfToken = await getCSRFToken();

      await api.post(
        "/accounts/logout/",
        {},
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
          },
        },
      );

      // Immediately notify SiteHeader that the user has logged out.
      setSessionUser(null);
      setAuthStatus("unauthenticated");

      await nav({ to: "/login" });
    } catch (err: unknown) {
      console.error("Logout failed:", err);

      if (axios.isAxiosError(err)) {
        const data = err.response?.data;

        setError(
          data?.error ??
            data?.detail ??
            data?.message ??
            "Logout failed. Please try again.",
        );
      } else {
        setError("An unexpected error occurred while logging out.");
      }
    } finally {
      setLogoutLoading(false);
    }
  }

  // Do not show feed content until authentication is confirmed.
  if (authStatus === "checking") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">
          Checking your login...
        </p>
      </div>
    );
  }

  // Logged-out users see only the login message.
  if (authStatus === "unauthenticated") {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="paper-card w-full max-w-sm space-y-4 p-8 text-center">
          <h1 className="text-2xl font-semibold">
            Please log in first
          </h1>

          <p className="text-sm text-muted-foreground">
            You need to be logged in to access your Suggesion Hub feed.
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



  const sel = (
    k: keyof typeof f,
    opts: [string, string][],
  ) => (
    <select
      className="field w-full"
      value={f[k]}
      onChange={(e) =>
        setF((previous) => ({
          ...previous,
          [k]: e.target.value,
        }))
      }
    >
      {opts.map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[240px_1fr]">
      {/* Filters */}
      <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
        <h2 className="text-lg font-semibold">Filters</h2>

        {sel("course", [
          ["", "All courses"],
          ["CSE220", "CSE220"],
          ["CSE221", "CSE221"],
          ["EEE201", "EEE201"],
        ])}

        {sel("intake", [
          ["", "All intakes"],
          ["48", "Intake 48"],
          ["49", "Intake 49"],
        ])}

        {sel("section", [
          ["", "All sections"],
          ["1", "Section 1"],
          ["2", "Section 2"],
          ["3", "Section 3"],
          ["4", "Section 4"],
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

      {/* Main feed */}
      <main>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl">
              Good evening, {me.name.split(" ")[0]}
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              People you follow first, then your courses, then your
              department.
            </p>
          </div>

          {/* Logout button */}
          <button
            type="button"
            onClick={handleLogout}
            disabled={logoutLoading}
            className="btn-ghost inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogOut size={18} />

            {logoutLoading ? "Logging out..." : "Logout"}
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

        <div className="mt-6 space-y-3">
          {list.slice(0, shown).map((p) => (
            <PdfCard key={p.id} pdf={p} />
          ))}

          {!list.length && (
            <p className="py-10 text-center text-muted-foreground">
              No PDFs match these filters.
            </p>
          )}
        </div>

        {shown < list.length && (
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
