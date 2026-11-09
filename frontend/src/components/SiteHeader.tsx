import { Link, useNavigate } from "@tanstack/react-router";
import { CircleUserRound, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

import { getSessionUser, notifyAuthChange, type SessionUser } from "@/lib/auth";
import api from "@/lib/api";
import { getCSRFToken } from "@/lib/utils";

const nav = [
  { to: "/feeds", label: "Feed" },
  { to: "/search", label: "Search" },
  { to: "/upload", label: "Upload" },
] as const;

export function SiteHeader() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const checkUser = async () => {
      try {
        const sessionUser = await getSessionUser();
        if (active) setUser(sessionUser);
      } catch {
        if (active) setUser(null);
      }
    };

    void checkUser();

    const handleAuthChange = () => {
      void checkUser();
    };

    window.addEventListener("auth-change", handleAuthChange);

    return () => {
      active = false;
      window.removeEventListener("auth-change", handleAuthChange);
    };
  }, []);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const csrfToken = await getCSRFToken();

      await api.post(
        "/accounts/logout/",
        {},
        {
          headers: {
            "X-CSRFToken": csrfToken,
          },
        },
      );

      setUser(null);
      notifyAuthChange();

      await navigate({ to: "/login" });
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Unable to log out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link to="/" className="font-display text-xl font-semibold">
          Suggestion Hub
          <span className="text-highlight">.</span>
        </Link>

        <nav className="hidden gap-1 md:flex">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
              activeProps={{
                className: "bg-secondary text-foreground",
              }}
            >
              {n.label}
            </Link>
          ))}

          {user?.role === "teacher" && (
            <Link
              to="/teacher"
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
              activeProps={{
                className: "bg-secondary text-foreground",
              }}
            >
              Review
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {user && (
            <>
              <Link
                to="/profile/$id"
                params={{ id: "me" }}
                aria-label={`${user.full_name} — my profile`}
                title={user.full_name}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{
                  className: "bg-secondary text-foreground",
                }}
              >
                <CircleUserRound size={22} />
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="btn-ghost flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                title="Log out"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">
                  {loggingOut ? "Logging out..." : "Logout"}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}