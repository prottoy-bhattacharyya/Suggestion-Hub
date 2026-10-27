import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";

const nav = [
  { to: "/feed", label: "Feed" },
  { to: "/search", label: "Search" },
  { to: "/upload", label: "Upload" },
  { to: "/teacher", label: "Review" },
  { to: "/admin", label: "Admin" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link to="/" className="font-display text-xl font-semibold">
          Margin<span className="text-highlight">.</span>
        </Link>
        <nav className="hidden gap-1 md:flex">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground" activeProps={{ className: "bg-secondary text-foreground" }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <button aria-label="Notifications" className="relative rounded-md p-2 hover:bg-secondary">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-highlight" />
          </button>
          <Link to="/profile/$id" params={{ id: "u1" }} className="grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">PV</Link>
          <Link to="/login" className="btn-ghost hidden sm:inline-flex">Log out</Link>
        </div>
      </div>
    </header>
  );
}
