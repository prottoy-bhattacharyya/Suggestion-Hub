import { Link } from "@tanstack/react-router";
import { CircleUserRound } from "lucide-react";
import { useEffect, useState } from "react";

import { getSessionUser, type SessionUser } from "@/lib/auth";

const nav = [
  { to: "/feeds", label: "Feed" },
  { to: "/search", label: "Search" },
  { to: "/upload", label: "Upload" },
  { to: "/teacher", label: "Review" },
  { to: "/admin", label: "Admin" },
] as const;

export function SiteHeader() {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let active = true;

    getSessionUser().then((sessionUser) => {
      if (active) setUser(sessionUser);
    });

    const handleAuthChange = () => {
      void getSessionUser().then((sessionUser) => {
        if (active) setUser(sessionUser);
      });
    };

    window.addEventListener("auth-change", handleAuthChange);

    return () => {
      active = false;
      window.removeEventListener("auth-change", handleAuthChange);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link to="/" className="font-display text-xl font-semibold">
          Suggesion Hub
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
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {user && (
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
          )}
        </div>
      </div>
    </header>
  );
}