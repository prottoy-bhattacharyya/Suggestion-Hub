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
          Suggesion Hub<span className="text-highlight">.</span>
        </Link>
        <nav className="hidden gap-1 md:flex">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground" activeProps={{ className: "bg-secondary text-foreground" }}>
              {n.label}
            </Link>
          ))}
        </nav>
        
      </div>
    </header>
  );
}
