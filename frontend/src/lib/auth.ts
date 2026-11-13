import api from "@/lib/api";

export type SessionUser = {
  id: number;
  email?: string;
  full_name: string;
  role: string;
  [key: string]: unknown;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const { data } = await api.get("/accounts/me/");
    const loggedIn = Boolean(data.loggedIn ?? data.logedIn);

    if (loggedIn && data.user) {
      sessionStorage.setItem("sessionUser", JSON.stringify(data.user));
    }
    return loggedIn ? (data.user as SessionUser) : null;
  } catch {
    return null;
  }
}

export function notifyAuthChange() {
  window.dispatchEvent(new Event("auth-change"));
}
