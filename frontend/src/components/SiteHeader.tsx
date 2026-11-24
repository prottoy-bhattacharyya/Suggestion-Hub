import { Link, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  BookOpen,
  Home,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trophy,
  UploadCloud,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { UserAvatar } from "@/components/UserAvatar";
import { getSessionUser, notifyAuthChange, type SessionUser } from "@/lib/auth";
import api from "@/lib/api";
import { getCSRFToken } from "@/lib/utils";

const nav = [
  { to: "/feeds", label: "Feed", Icon: Home, requiresAuth: false, role: "any" },
  { to: "/search", label: "Search", Icon: Search, requiresAuth: false, role: "any" },
  { to: "/leaderboard", label: "Leaderboard", Icon: Trophy, requiresAuth: false, role: "any" },
  { to: "/upload", label: "Upload", Icon: UploadCloud, requiresAuth: true, role: "any" },
  // { to: "/settings", label: "Settings", Icon: Settings, requiresAuth: true, role: "any" },
  { to: "/analytics", label: "Analytics", Icon: BarChart3, requiresAuth: true, role: "any" },
  { to: "/teacher", label: "Review", Icon: ShieldCheck, requiresAuth: true, role: "teacher" },
] as const;

export function SiteHeader() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const csrfToken = await getCSRFToken();

      await api.post(
        "/accounts/logout/",
        null,
        csrfToken ? { headers: { "X-CSRFToken": csrfToken } } : undefined,
      );
    } catch {
      // Session may already be gone server-side; still clear locally.
    } finally {
      setUser(null);
      notifyAuthChange();
      setLoggingOut(false);
      navigate({ to: "/login" });
    }
  };

  const linkBase =
    "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all text-muted-foreground hover:text-foreground";
  const linkActive = "bg-background text-foreground shadow-sm";

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        {/* Logo */}
        <Link to="/" className="group flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25 transition-transform group-hover:-translate-y-0.5">
            <BookOpen className="h-4 w-4" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">
            Suggestion Hub<span className="text-primary">.</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="ml-2 hidden items-center gap-1 rounded-full bg-muted p-1 md:flex">
          {nav.map(({ to, label, Icon, requiresAuth, role }) => (
            (!requiresAuth || user) && (role === "any" || user?.role === role) && ( 
              <Link key={to} to={to} className={linkBase} activeProps={{ className: linkActive }}>
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            ) 
            ||
            (user?.role == "teacher" && role === "teacher") && (
              <Link key={to} to={to} className={linkBase} activeProps={{ className: linkActive }}>
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            )
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Link
                to="/profile/$id"
                params={{ id: "me" }}
                aria-label={`${user.full_name} — my profile`}
                title={user.full_name}
                className="group flex items-center gap-2.5 rounded-full border border-border/60 bg-card py-1 pl-1 pr-3 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
              >
                <UserAvatar
                  name={user.full_name}
                  src={user.avatar_url}
                  className="size-8 text-xs"
                />
                <span className="hidden max-w-28 truncate text-sm font-medium sm:block">
                  {user.full_name.split(" ")[0]}
                </span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                title="Log out"
                aria-label="Log out"
              >
                <LogOut size={17} />
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-md shadow-primary/25 transition-transform hover:-translate-y-0.5"
            >
              <Sparkles className="h-3.5 w-3.5" /> Log in
            </Link>
          )}

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen((p) => !p)}
            className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <nav className="animate-in fade-in slide-in-from-top-1 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-1">
            {nav.map(({ to, label, Icon, requiresAuth, role }) => (
            (!requiresAuth || user) && (role === "any" || user?.role === role) && ( 
              <Link key={to} to={to} className={linkBase} activeProps={{ className: linkActive }}>
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            ) 
            ||
            (user?.role == "teacher" && role === "teacher") && (
              <Link key={to} to={to} className={linkBase} activeProps={{ className: linkActive }}>
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            )
          ))}
          </div>
        </nav>
      )}
    </header>
  );
}
