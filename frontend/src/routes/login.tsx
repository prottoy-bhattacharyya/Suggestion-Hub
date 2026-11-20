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
  Sparkles,
  ArrowRight,
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

/**
 * Animated password buddy.
 * Eyes remain closed while the password is hidden.
 * The character peeks when the password is visible.
 */
function PasswordBuddy({ peeking }: { peeking: boolean }) {
  return (
    <div
      className={`password-buddy ${peeking ? "is-peeking" : "is-hiding"}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 240 180"
        className="h-36 w-48 sm:h-40 sm:w-52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="buddyBody" x1="65" y1="30" x2="180" y2="155">
            <stop stopColor="#A78BFA" />
            <stop offset="1" stopColor="#6D5AE6" />
          </linearGradient>
          <linearGradient id="buddyLaptop" x1="65" y1="120" x2="180" y2="165">
            <stop stopColor="#64748B" />
            <stop offset="1" stopColor="#334155" />
          </linearGradient>
          <filter id="buddyShadow" x="20" y="5" width="200" height="180">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>

        {/* Soft shadow */}
        <ellipse
          cx="120"
          cy="158"
          rx="70"
          ry="10"
          fill="#6D5AE6"
          opacity=".14"
          filter="url(#buddyShadow)"
        />

        {/* Arms */}
        <path
          d="M72 119 Q43 118 47 145 Q49 154 67 145 L91 131"
          fill="#927CF0"
          className="buddy-arm buddy-arm-left"
        />
        <path
          d="M168 119 Q197 118 193 145 Q191 154 173 145 L149 131"
          fill="#927CF0"
          className="buddy-arm buddy-arm-right"
        />

        {/* Body */}
        <path
          d="M72 92 Q120 76 168 92 L178 151 Q120 169 62 151 Z"
          fill="url(#buddyBody)"
        />
        <ellipse cx="120" cy="105" rx="30" ry="7" fill="#C4B5FD" opacity=".3" />

        {/* Ears */}
        <circle cx="72" cy="57" r="16" fill="#927CF0" />
        <circle cx="168" cy="57" r="16" fill="#927CF0" />
        <circle cx="72" cy="57" r="8" fill="#F9A8D4" />
        <circle cx="168" cy="57" r="8" fill="#F9A8D4" />

        {/* Head */}
        <ellipse
          cx="120"
          cy="65"
          rx="55"
          ry="49"
          fill="url(#buddyBody)"
          className="buddy-head"
        />

        {/* Forehead shine */}
        <ellipse
          cx="99"
          cy="31"
          rx="16"
          ry="6"
          fill="white"
          opacity=".18"
          transform="rotate(-25 99 31)"
        />

        {/* Blush */}
        <ellipse cx="85" cy="77" rx="9" ry="5" fill="#F9A8D4" opacity=".7" />
        <ellipse cx="155" cy="77" rx="9" ry="5" fill="#F9A8D4" opacity=".7" />

        {/* Closed eyes */}
        <g className={`buddy-closed-eyes ${peeking ? "eyes-hidden" : ""}`}>
          <path
            d="M88 62 Q98 72 108 62"
            stroke="#30265F"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M132 62 Q142 72 152 62"
            stroke="#30265F"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>

        {/* Open / peeking eyes */}
        <g className={`buddy-open-eyes ${peeking ? "eyes-visible" : ""}`}>
          <ellipse cx="99" cy="62" rx="8" ry="11" fill="white" />
          <ellipse cx="141" cy="62" rx="8" ry="11" fill="white" />
          <ellipse cx="101" cy="65" rx="4" ry="7" fill="#30265F" />
          <ellipse cx="143" cy="65" rx="4" ry="7" fill="#30265F" />
          <circle cx="102" cy="62" r="2" fill="white" />
          <circle cx="144" cy="62" r="2" fill="white" />
        </g>

        {/* Mouth */}
        <path
          d="M112 83 Q120 90 128 83"
          stroke="#30265F"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Laptop */}
        <path
          d="M62 121 Q62 116 68 116 H172 Q178 116 178 121 V153 H62 Z"
          fill="url(#buddyLaptop)"
          stroke="#94A3B8"
          strokeWidth="1.5"
        />
        <path
          d="M51 153 H189 L181 161 H59 Z"
          fill="#94A3B8"
        />
        <rect x="105" y="121" width="30" height="3" rx="1.5" fill="#CBD5E1" opacity=".65" />

        {/* Typing fingers */}
        <circle cx="79" cy="143" r="5" fill="#D8CCFF" className="buddy-finger buddy-finger-left" />
        <circle cx="161" cy="143" r="5" fill="#D8CCFF" className="buddy-finger buddy-finger-right" />
      </svg>

      <span className="mt-1 block text-center text-xs font-medium text-muted-foreground">
        {peeking ? "Just checking... 👀" : "Your password is safe with me 🤫"}
      </span>
    </div>
  );
}

function Login() {
  const nav = useNavigate();

  const [forgot, setForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

        if (response.data.loggedIn || response.data.logedIn) {
          await nav({ to: "/feeds" });
        }
      } catch (err: unknown) {
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
        { email, password },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
          },
        },
      );

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

  const labelCls =
    "mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";

  const fieldCls =
    "w-full rounded-xl border border-border bg-background/80 px-4 py-3 text-sm outline-none transition-all duration-300 placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-4 focus:ring-primary/10 focus:shadow-[0_0_22px_rgba(139,92,246,0.12)] disabled:opacity-60";

  return (
    <>
      <style>{`
        @keyframes buddy-float {
          0%, 100% { transform: translateY(0) rotate(-1deg); }
          50% { transform: translateY(-7px) rotate(1deg); }
        }

        @keyframes buddy-type {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        @keyframes buddy-glow {
          0%, 100% { opacity: .35; transform: scale(.95); }
          50% { opacity: .7; transform: scale(1.08); }
        }

        @keyframes login-light {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(22px, -18px); }
        }

        @keyframes login-appear {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .password-buddy {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          animation: buddy-float 4s ease-in-out infinite;
          transition: transform .35s ease;
        }

        .password-buddy.is-peeking {
          transform: translateY(-3px) rotate(2deg);
        }

        .buddy-head {
          transform-origin: 120px 65px;
          transition: transform .35s ease;
        }

        .is-peeking .buddy-head {
          transform: rotate(-5deg) translateY(-2px);
        }

        .buddy-open-eyes,
        .buddy-closed-eyes {
          transition: opacity .22s ease, transform .22s ease;
        }

        .buddy-open-eyes {
          opacity: 0;
          transform: scaleY(.2);
          transform-origin: center;
        }

        .buddy-closed-eyes {
          opacity: 1;
        }

        .buddy-open-eyes.eyes-visible {
          opacity: 1;
          transform: scaleY(1);
        }

        .buddy-closed-eyes.eyes-hidden {
          opacity: 0;
          transform: scaleY(.2);
        }

        .buddy-finger {
          animation: buddy-type .45s ease-in-out infinite;
        }

        .buddy-finger-right {
          animation-delay: .2s;
        }

        .buddy-arm {
          transform-origin: center;
          animation: buddy-type .6s ease-in-out infinite;
        }

        .buddy-arm-right {
          animation-delay: .3s;
        }

        .login-card {
          animation: login-appear .65s cubic-bezier(.2,.8,.2,1) both;
          box-shadow: 0 25px 80px -30px rgba(100, 70, 190, .22),
                      0 8px 30px -18px rgba(0, 0, 0, .18);
        }

        .login-light {
          animation: login-light 9s ease-in-out infinite;
        }

        .login-light-glow {
          animation: buddy-glow 6s ease-in-out infinite;
        }

        .login-highlight {
          transition: transform .25s ease, background-color .25s ease,
                      box-shadow .25s ease;
        }

        .login-highlight:hover {
          transform: translateX(5px);
        }

        .login-highlight:hover .highlight-icon {
          box-shadow: 0 0 24px rgba(139, 92, 246, .22);
          transform: scale(1.06);
        }

        .highlight-icon {
          transition: transform .25s ease, box-shadow .25s ease;
        }

        @media (prefers-reduced-motion: reduce) {
          .password-buddy,
          .buddy-finger,
          .buddy-arm,
          .login-card,
          .login-light,
          .login-light-glow {
            animation: none !important;
          }

          .login-highlight,
          .highlight-icon {
            transition: none !important;
          }
        }
      `}</style>

      <div className="relative isolate mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden px-4 lg:grid-cols-[1fr_minmax(0,28rem)] lg:gap-16 lg:px-8">
        {/* Ambient background lights */}
        <div
          aria-hidden="true"
          className="login-light-glow pointer-events-none absolute -left-36 top-1/4 -z-10 h-96 w-96 rounded-full bg-primary/10 blur-[100px]"
        />
        <div
          aria-hidden="true"
          className="login-light pointer-events-none absolute -right-32 top-10 -z-10 h-80 w-80 rounded-full bg-violet-400/10 blur-[90px]"
        />
        <div
          aria-hidden="true"
          className="login-light-glow pointer-events-none absolute bottom-0 left-1/2 -z-10 h-72 w-72 rounded-full bg-blue-400/10 blur-[100px]"
        />

        {/* Intro panel */}
        <section className="relative hidden flex-col justify-center overflow-hidden py-16 lg:flex">
          <div className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary shadow-sm shadow-primary/10">
              <Sparkles className="h-3 w-3" />
              Suggestion Hub
            </span>

            <h2 className="mt-6 max-w-md text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Notes your teachers have{" "}
              <span className="text-primary">already checked</span>.
            </h2>

            <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
              Suggestion Hub brings your course’s notes and exam suggestions
              into one place, so you spend less time hunting and more time
              studying.
            </p>

            <ul className="mt-10 max-w-md space-y-6">
              {highlights.map(({ icon: Icon, title, text }) => (
                <li key={title} className="login-highlight flex gap-4 rounded-2xl p-2">
                  <span className="highlight-icon grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-primary/10 bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-semibold tracking-tight">{title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                      {text}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Login form */}
        <section className="flex flex-col justify-center py-12 sm:py-16 lg:px-0">
          <div className="login-card relative mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-border/60 bg-card/90 p-6 backdrop-blur-xl sm:p-9">
            {/* Card lighting */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-primary/15 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-24 -left-20 h-52 w-52 rounded-full bg-violet-400/10 blur-3xl"
            />

            <div className="relative">
              <h1 className="text-3xl font-semibold tracking-tight">
                {forgot ? "Reset your password" : "Welcome back"}
              </h1>

              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {forgot
                  ? "Enter your university email and we’ll send you a reset link."
                  : "Log in with your university email."}
              </p>

              {/* Animated character */}
              {!forgot && (
                <div className="relative my-5 flex justify-center">
                  <div
                    aria-hidden="true"
                    className="absolute top-8 h-24 w-44 rounded-full bg-primary/10 blur-3xl"
                  />
                  <PasswordBuddy peeking={showPassword} />
                </div>
              )}

              <form
                className="relative mt-6 space-y-5"
                onSubmit={handleLogin}
              >
                <div>
                  <label htmlFor="email" className={labelCls}>
                    University email
                  </label>

                  <input
                    id="email"
                    name="email"
                    className={fieldCls}
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
                      <label htmlFor="password" className={labelCls}>
                        Password
                      </label>

                      <button
                        type="button"
                        onClick={toggleForgot}
                        className="rounded text-xs font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        className={`${fieldCls} pr-12`}
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        required
                        disabled={loading}
                        onFocus={() => setShowPassword(false)}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword((previous) => !previous)
                        }
                        className="absolute inset-y-0 right-0 flex items-center justify-center rounded-r-xl px-3 text-muted-foreground transition-all duration-200 hover:scale-110 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        aria-pressed={showPassword}
                        title={
                          showPassword ? "Hide password" : "Show password"
                        }
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
                    className="flex animate-in fade-in slide-in-from-top-2 items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-3.5 text-sm text-destructive"
                    role="alert"
                  >
                    <AlertCircle
                      size={18}
                      className="mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div
                    className="flex animate-in fade-in slide-in-from-top-2 items-start gap-2 rounded-2xl border border-success/30 bg-success/5 p-3.5 text-sm text-success"
                    role="status"
                  >
                    <CheckCircle2
                      size={18}
                      className="mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{success}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/30 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {busy ? (
                    <LoaderCircle
                      size={18}
                      className="animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                  ) : (
                    <ArrowRight
                      size={18}
                      className="transition-transform duration-300 group-hover:translate-x-1"
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
                    className="w-full rounded py-1 text-center text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    Back to log in
                  </button>
                )}
              </form>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link
              to="/signup"
              className="font-semibold text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </section>
      </div>
    </>
  );
}
