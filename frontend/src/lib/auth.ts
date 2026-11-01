import api from "@/lib/api";

export type SessionUser = {
  id: number;
  email?: string;
  full_name: string;
  role: string;
  [key: string]: unknown;
};

// undefined = not checked yet; null = checked but nobody logged in.
let cachedUser: SessionUser | null | undefined;

export async function getSessionUser(): Promise<SessionUser | null> {
  if (cachedUser !== undefined) {
    return cachedUser;
  }

  try {
    const { data } = await api.get("/accounts/me/");
    const loggedIn = Boolean(data.loggedIn ?? data.logedIn);
    cachedUser = loggedIn ? (data.user as SessionUser) : null;
  } catch {
    cachedUser = null;
  }

  return cachedUser;
}

// Call after login/logout so every component sees the new session state.
export function setSessionUser(user: SessionUser | null) {
  cachedUser = user;
  window.dispatchEvent(new Event("auth-change"));
}
