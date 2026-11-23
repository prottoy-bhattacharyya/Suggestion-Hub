import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Crown,
  LoaderCircle,
  Medal,
  RefreshCw,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";

import api from "@/lib/api";
import {
  titleTone,
  type DepartmentsResponse,
  type LeaderboardEntry,
  type LeaderboardResponse,
} from "@/lib/rankings";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — Suggestion Hub" },
      {
        name: "description",
        content: "See the top contributors and their earned ranks.",
      },
      { property: "og:title", content: "Leaderboard — Suggestion Hub" },
      {
        property: "og:description",
        content: "Top students and teachers ranked by contribution points.",
      },
    ],
  }),
  component: LeaderboardPage,
});

const numberFormat = new Intl.NumberFormat();

function LeaderboardPage() {
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [scope, setScope] = useState<"all" | "department">("all");
  const [departmentId, setDepartmentId] = useState("");

  const departmentsQuery = useQuery({
    queryKey: ["departments"],
    queryFn: async ({ signal }) => {
      const { data } = await api.get<DepartmentsResponse>("/academics/departments_list/", {
        signal,
      });
      return data.departments ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const leaderboardQuery = useQuery({
    queryKey: ["rankings", "users", role, scope, departmentId],
    queryFn: async ({ signal }) => {
      const params: Record<string, string | number> = {
        role,
        scope,
        limit: 50,
      };
      if (scope === "department" && departmentId) {
        params["department_id"] = departmentId;
      }
      const { data } = await api.get<LeaderboardResponse>("/rankings/users/", {
        params,
        signal,
      });
      return data;
    },
    enabled: scope !== "department" || Boolean(departmentId),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  });

  const entries = leaderboardQuery.data?.entries ?? [];
  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Trophy className="size-3.5" />
            All-time rankings
          </span>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Suggestion Hub Leaderboard
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Earn points through approved uploads, ratings, views, reviews, comments and followers.
            Points unlock titles from Newbie to Legendary Grandmaster.
          </p>
        </div>

        {leaderboardQuery.data?.viewer && (
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Your standing</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Crown className="size-5" />
              </span>
              <div>
                <p className="text-lg font-semibold tabular-nums">
                  {leaderboardQuery.data.viewer.rank
                    ? `#${leaderboardQuery.data.viewer.rank}`
                    : "Unranked"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {leaderboardQuery.data.viewer.rank_title} ·{" "}
                  {numberFormat.format(leaderboardQuery.data.viewer.points)} pts
                </p>
              </div>
            </div>
          </div>
        )}
      </header>

      <section
        className="mt-8 rounded-3xl border border-border bg-card p-5 shadow-sm"
        aria-label="Leaderboard filters"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Board
              </p>
              <div className="inline-flex rounded-full bg-muted p-1" role="group" aria-label="Role">
                {(["student", "teacher"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setRole(option)}
                    aria-pressed={role === option}
                    className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition ${
                      role === option
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {option}s
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Scope
              </p>
              <div
                className="inline-flex rounded-full bg-muted p-1"
                role="group"
                aria-label="Scope"
              >
                {(["all", "department"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setScope(option)}
                    aria-pressed={scope === option}
                    className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition ${
                      scope === option
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {option === "all" ? "Global" : "Department"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {scope === "department" && (
            <label className="flex flex-col gap-2 text-sm lg:w-80">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Department
              </span>
              <select
                value={departmentId}
                onChange={(event) => setDepartmentId(event.target.value)}
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
              >
                <option value="">Select a department</option>
                {(departmentsQuery.data ?? []).map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name} ({department.code})
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </section>

      {leaderboardQuery.isLoading && (
        <div
          className="mt-8 grid place-items-center rounded-3xl border border-border bg-card py-20"
          role="status"
        >
          <LoaderCircle className="size-7 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Loading rankings…</p>
        </div>
      )}

      {leaderboardQuery.isError && (
        <div
          className="mt-8 rounded-3xl border border-destructive/40 bg-destructive/5 p-6"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-5 text-destructive" />
            <div className="min-w-0">
              <p className="font-semibold">Could not load the leaderboard.</p>
              <p className="mt-1 text-sm text-muted-foreground">Please try again in a moment.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void leaderboardQuery.refetch()}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium"
          >
            <RefreshCw className="size-4" />
            Retry
          </button>
        </div>
      )}

      {scope === "department" && !departmentId && (
        <div className="mt-8 rounded-3xl border border-dashed border-border p-12 text-center">
          <Users className="mx-auto size-7 text-muted-foreground" />
          <p className="mt-3 font-semibold">Choose a department</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Select a department above to see its ranked contributors.
          </p>
        </div>
      )}

      {leaderboardQuery.data && entries.length === 0 && (
        <div className="mt-8 rounded-3xl border border-dashed border-border p-12 text-center">
          <Sparkles className="mx-auto size-7 text-muted-foreground" />
          <p className="mt-3 font-semibold">No ranked users yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Rankings appear once {role}s have approved contributions.
          </p>
          <Link
            to="/upload"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
          >
            Upload notes
            <ArrowRight className="size-4" />
          </Link>
        </div>
      )}

      {leaderboardQuery.data && entries.length > 0 && (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-3" aria-label="Top contributors">
            {podium.map((entry, index) => (
              <PodiumCard key={entry.user_id} entry={entry} position={index + 1} />
            ))}
          </section>

          <section className="mt-8 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
              <h2 className="font-display text-xl font-semibold">Full ranking</h2>
              <p className="text-sm text-muted-foreground">
                {numberFormat.format(leaderboardQuery.data.total)} ranked{" "}
                {role === "student" ? "students" : "teachers"}
              </p>
            </div>

            <ol className="divide-y divide-border">
              {rest.map((entry) => (
                <li
                  key={entry.user_id}
                  className={`px-4 py-4 transition hover:bg-muted/40 sm:px-6 ${
                    entry.is_me ? "bg-primary/5" : ""
                  }`}
                >
                  <Link
                    to="/profile/$id"
                    params={{ id: String(entry.user_id) }}
                    className="flex items-center gap-4"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold tabular-nums">
                      {entry.rank ?? "—"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{entry.full_name}</p>
                        {entry.is_me && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                            You
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {entry.department_name ?? "No department"}
                      </p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${titleTone(entry.title)}`}
                      >
                        {entry.title}
                      </span>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {entry.role === "teacher"
                          ? `${entry.stats.completed_reviews} reviews`
                          : `${entry.stats.approved_uploads} uploads`}
                      </p>
                    </div>
                    <p className="w-20 shrink-0 text-right font-semibold tabular-nums">
                      {numberFormat.format(entry.points)}
                      <span className="block text-xs font-normal text-muted-foreground">pts</span>
                    </p>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </main>
  );
}

function PodiumCard({ entry, position }: { entry: LeaderboardEntry; position: number }) {
  const Icon = position === 1 ? Crown : position === 2 ? Medal : Trophy;

  return (
    <div
      className={`relative rounded-3xl border bg-card p-5 shadow-sm ${
        position === 1 ? "border-primary/40 ring-1 ring-primary/20" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between">
        <span
          className={`grid size-10 place-items-center rounded-xl ${
            position === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          <Icon className="size-5" />
        </span>
        <span className="text-sm font-semibold tabular-nums text-muted-foreground">
          #{entry.rank ?? position}
        </span>
      </div>

      <span
        className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-medium ${titleTone(entry.title)}`}
      >
        {entry.title}
      </span>

      <Link
        to="/profile/$id"
        params={{ id: String(entry.user_id) }}
        className="mt-3 block truncate font-display text-xl font-semibold hover:underline"
      >
        {entry.full_name}
      </Link>
      <p className="truncate text-sm text-muted-foreground">
        {entry.department_name ?? "No department"}
      </p>

      <p className="mt-5 text-3xl font-semibold tabular-nums">
        {numberFormat.format(entry.points)}
        <span className="ml-1 text-sm font-normal text-muted-foreground">pts</span>
      </p>
    </div>
  );
}
