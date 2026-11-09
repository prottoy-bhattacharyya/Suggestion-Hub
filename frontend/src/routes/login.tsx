import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  Eye,
  EyeOff,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  Search,
  MessageSquareText,
} from "lucide-react";
import { getCSRFToken } from "@/lib/utils";
import api from "@/lib/api";
import { notifyAuthChange } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — Suggestion Hub" },
      {
        name: "description",
        content: "Log in with your university email.",
      },
      { property: "og:title", content: "Log in — Suggestion Hub" },
      {
        property: "og:description",
        content: "Access verified course notes.",
      },
    ],
  }),
  component: Login,
});

const highlights = [
  {
    icon: GraduationCap,
    title: "Checked by teachers",
    text: "Every note and suggestion is approved by a teacher for the course before it appears.",
  },
  {
    icon: Search,
    title: "Find what fits your class",
    text: "Search by course, intake and section, or by what the PDF covers.",
  },
  {
    icon: MessageSquareText,
    title: "Ask questions, get answers",
    text: "Our AI answers from the notes themselves, so you can study faster.",
  },
];

function Login() {
  const nav = useNavigate();

  const [forgot, setForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Check whether the user already has an authenticated session.
  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const csrfToken = await getCSRFToken();

        const response = await api.get("/accounts/me/", {
          headers: {
            Accept: "application/json",
            ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
          },
        });

        if (!active) return;

        // Use the property name returned by your Django backend.
        if (response.data.loggedIn || response.data.logedIn) {
          await nav({ to: "/feeds" });
        }
      } catch (err: unknown) {
        // A failed session check should not prevent manual login.
        if (axios.isAxiosError(err)) {
          console.error(
            "Session check failed:",
            err.response?.data ?? err.message,
          );
        } else {
          console.error("Session check failed:", err);
        }
      } finally {
        if (active) {
          setCheckingSession(false);
        }
      }
    }

    void checkSession();

    return () => {
      active = false;
    };
  }, [nav]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setSuccess("");

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      setLoading(true);

      const csrfToken = await getCSRFToken();

      await api.post(
        "/accounts/login/",
        {
          email,
          password,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
          },
        },
      );

      // Django session authentication normally uses the session cookie.
      // Notify SiteHeader that the user has logged in.
      notifyAuthChange();

      setSuccess("Login successful!");
      await nav({ to: "/feeds" });
    } catch (err: unknown) {
      console.error("Login error:", err);

      if (axios.isAxiosError(err)) {
        const responseData = err.response?.data as
          | {
              error?: string;
              detail?: string;
              message?: string;
              non_field_errors?: string[];
            }
          | undefined;

        const backendMessage =
          responseData?.error ??
          responseData?.detail ??
          responseData?.message;

        if (typeof backendMessage === "string") {
          setError(backendMessage);
        } else if (Array.isArray(responseData?.non_field_errors)) {
          setError(responseData.non_field_errors.join(" "));
        } else if (err.response) {
          setError(
            `Login failed (HTTP ${err.response.status}). Please check your credentials.`,
          );
        } else {
          setError(
            "Cannot connect to the server. Check that Django is running and CORS is configured correctly.",
          );
        }
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  function toggleForgot() {
    setForgot((previous) => !previous);
    setShowPassword(false);
    setError("");
    setSuccess("");
  }

  const busy = loading || checkingSession;

  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl lg:grid-cols-[1fr_minmax(0,28rem)] lg:gap-16 lg:px-8">
      {/* Intro panel (desktop only) */}
      <section className="hidden flex-col justify-center py-16 lg:flex">
        <h2 className="max-w-md text-4xl font-semibold leading-tight tracking-tight">
          Notes your teachers have already checked.
        </h2>

        <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
          Suggestion Hub brings your course’s notes and exam suggestions into
          one place, so you spend less time hunting and more time studying.
        </p>

        <ul className="mt-10 max-w-md space-y-6">
          {highlights.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>

              <div>
                <p className="font-medium">{title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                  {text}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Form */}
      <section className="flex flex-col justify-center px-4 py-16 sm:px-8 lg:px-0">
        <div className="paper-card mx-auto w-full max-w-md p-7 sm:p-9">
          <h1 className="text-3xl font-semibold tracking-tight">
            {forgot ? "Reset your password" : "Welcome back"}
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {forgot
              ? "Enter your university email and we’ll send you a reset link."
              : "Log in with your university email."}
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleLogin} noValidate={false}>
            <div>
              <label htmlFor="email" className="label-sm">
                University email
              </label>

              <input
                id="email"
                name="email"
                className="field w-full"
                type="email"
                placeholder="you@university.edu"
                autoComplete="email"
                autoFocus
                required
                disabled={loading}
              />
            </div>

            {!forgot && (
              <div>
                <div className="flex items-baseline justify-between">
                  <label htmlFor="password" className="label-sm">
                    Password
                  </label>

                  <button
                    type="button"
                    onClick={toggleForgot}
                    className="rounded text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Password field with show/hide toggle */}
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    className="field w-full pr-12"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    required
                    disabled={loading}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
                    className="absolute inset-y-0 right-0 flex items-center justify-center rounded-r-md px-3 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff size={20} aria-hidden="true" />
                    ) : (
                      <Eye size={20} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div
                className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-500"
                role="alert"
              >
                <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div
                className="flex items-start gap-2 rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-sm text-green-600"
                role="status"
              >
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="btn-primary inline-flex w-full items-center justify-center gap-2 py-3 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy && (
                <LoaderCircle
                  size={18}
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              )}

              {loading
                ? "Logging in…"
                : checkingSession
                  ? "Checking session…"
                  : forgot
                    ? "Send reset link"
                    : "Log in"}
            </button>

            {forgot && (
              <button
                type="button"
                onClick={toggleForgot}
                className="w-full rounded text-center text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                Back to log in
              </button>
            )}
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link
            to="/signup"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </section>
    </div>
  );
}