export type RankTitle = {
  title: string;
  start_point: number;
  end_point: number;
};

export type RankingStats = {
  approved_uploads: number;
  ratings_received: number;
  views_received: number;
  followers: number;
  comments_received: number;
  completed_reviews: number;
};

export type LeaderboardEntry = {
  rank: number | null;
  user_id: number;
  full_name: string;
  role: "student" | "teacher" | "admin";
  department_id: number | null;
  department_name: string | null;
  avatar_url?: string | null;
  points: number;
  title: string;
  rank_global: number | null;
  rank_department: number | null;
  is_me: boolean;
  is_following: boolean | null;
  stats: RankingStats;
};

export type ViewerStanding = {
  user_id: number;
  rank: number | null;
  points: number;
  rank_title: string;
  is_ranked: boolean;
};

export type LeaderboardResponse = {
  status: string;
  role: "student" | "teacher";
  scope: "all" | "department";
  department_id: number | null;
  period: "all";
  total: number;
  generated_at: string;
  entries: LeaderboardEntry[];
  viewer: ViewerStanding | null;
};

export type DepartmentsResponse = {
  departments: Array<{
    id: number;
    name: string;
    code: string;
  }>;
};

export function titleTone(title: string): string {
  if (title === "Legendary Grandmaster") {
    return "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-300";
  }
  if (title === "Grandmaster") {
    return "border-purple-500/40 bg-purple-500/10 text-purple-600 dark:text-purple-300";
  }
  if (title === "Master") {
    return "border-indigo-500/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300";
  }
  if (title === "Expert") {
    return "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-300";
  }
  if (title === "Pupil") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
  }
  return "border-border bg-muted text-muted-foreground";
}
