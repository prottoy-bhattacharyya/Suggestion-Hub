import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import axios from "axios";
import { Eye, EyeOff } from "lucide-react";
import { getCSRFToken } from "@/lib/utils";
import api from "@/lib/api";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — Suggesion Hub" },
      {
        name: "description",
        content: "Log in with your university email.",
      },
      { property: "og:title", content: "Log in — Suggesion Hub" },
      {
        property: "og:description",
        content: "Access verified course notes.",
      },
    ],
  }),
  component: Login,
});

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

      const response = await api.post(
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
      // Do not store a CSRF token as an access token.
      console.log("Login response:", response.data);

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

  return (
    <div className="mx-auto max-w-sm px-4 py-20">
      <h1 className="text-3xl">
        {forgot ? "Reset password" : "Welcome back"}
      </h1>

      <p className="mt-1 text-sm text-muted-foreground">
        {forgot
          ? "We'll email you a reset link."
          : "Use your university email."}
      </p>

      <form className="paper-card mt-6 space-y-4 p-6" onSubmit={handleLogin}>
        <div>
          <label htmlFor="email" className="label-sm">
            Email
          </label>

          <input
            id="email"
            name="email"
            className="field w-full"
            type="email"
            placeholder="you@university.edu"
            autoComplete="email"
            required
          />
        </div>

        {!forgot && (
          <div>
            <label htmlFor="password" className="label-sm">
              Password
            </label>

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
              />

              <button
                type="button"
                onClick={() => setShowPassword((previous) => !previous)}
                className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-muted-foreground transition-colors hover:text-foreground"
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
            className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-500"
            role="alert"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className="rounded-md border border-green-500/30 bg-green-500/5 p-3 text-sm text-green-600"
            role="status"
          >
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || checkingSession}
          className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Please wait..."
            : checkingSession
              ? "Checking session..."
              : forgot
                ? "Send reset link"
                : "Log in"}
        </button>

        <button
          type="button"
          onClick={() => {
            setForgot((previous) => !previous);
            setShowPassword(false);
            setError("");
            setSuccess("");
          }}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {forgot ? "Back to log in" : "Forgot password?"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm">
        New here?{" "}
        <Link to="/signup" className="font-semibold text-primary">
          Create an account
        </Link>
      </p>
    </div>
  );
}