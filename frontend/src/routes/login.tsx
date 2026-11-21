import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
import {
  Mascot,
  MASCOT_STYLES,
  type LookAt,
  type MascotHandle,
  type MascotState,
} from "@/components/mascot";

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

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

const STYLES = `
  /* Page lights */
  .login-orb {
    position: absolute;
    border-radius: 9999px;
    filter: blur(64px);
    animation: login-float 16s ease-in-out infinite;
  }
  .login-orb-a { width: 26rem; height: 26rem; left: -8rem; top: 10%; background: hsl(var(--primary) / .18); }
  .login-orb-b { width: 22rem; height: 22rem; right: -6rem; bottom: 0; background: hsl(var(--primary) / .14); animation-delay: -6s; animation-direction: alternate-reverse; }
  @keyframes login-float {
    0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
    50% { transform: translate3d(30px, -24px, 0) scale(1.08); }
  }
  .login-spot {
    position: absolute;
    inset: 0;
    background: radial-gradient(560px circle at var(--px, 30%) var(--py, 30%), hsl(var(--primary) / .10), transparent 65%);
  }

  .login-rise { opacity: 0; animation: login-rise .7s cubic-bezier(.2, .8, .2, 1) forwards; }
  @keyframes login-rise {
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: none; }
  }

  .login-shimmer {
    background: linear-gradient(100deg, hsl(var(--primary)) 20%, hsl(var(--primary) / .55) 45%, hsl(var(--primary)) 70%);
    background-size: 220% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: login-shimmer 5s linear infinite;
  }
  @keyframes login-shimmer { to { background-position: -220% 0; } }

  /* Card: tilts a little toward the pointer, with a moving light and shadow */
  .login-card {
    transform: perspective(1100px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
    transition: transform .25s ease-out, box-shadow .25s ease-out;
    box-shadow:
      var(--sx, 0px) calc(var(--sy, 0px) + 28px) 60px -16px hsl(var(--primary) / .30),
      0 2px 6px rgb(0 0 0 / .08),
      inset 0 1px 0 rgb(255 255 255 / .08);
  }
  .login-card::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 0;
    border-radius: inherit;
    pointer-events: none;
    background: radial-gradient(360px circle at var(--mx, -999px) var(--my, -999px), hsl(var(--primary) / .12), transparent 60%);
  }
  .login-card::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 0;
    border-radius: inherit;
    padding: 1px;
    pointer-events: none;
    background: radial-gradient(240px circle at var(--mx, -999px) var(--my, -999px), hsl(var(--primary) / .75), transparent 70%);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
  }

  /* Button light that follows the pointer */
  .login-btn { position: relative; overflow: hidden; }
  .login-btn::before {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(140px circle at var(--bx, 50%) var(--by, 50%), rgb(255 255 255 / .35), transparent 60%);
    opacity: 0;
    transition: opacity .25s;
  }
  .login-btn:hover:not(:disabled)::before { opacity: 1; }

  @media (prefers-reduced-motion: reduce) {
    .login-orb, .login-shimmer { animation: none; }
    .login-rise { animation: none; opacity: 1; }
    .login-card { transition: none; }
  }
`;

function Login() {
  const nav = useNavigate();

  const [forgot, setForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Mascot and lighting state
  const [emailFocus, setEmailFocus] = useState(false);
  const [pwFocus, setPwFocus] = useState(false);
  const [sad, setSad] = useState(false);

  const mascotRef = useRef<MascotHandle>(null);
  const lookAtRef = useRef<LookAt>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const reducedRef = useRef(false);

  useEffect(() => {
    reducedRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

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

  // The mascot looks worried for a moment after an error, then relaxes.
  useEffect(() => {
    if (!error) return;

    setSad(true);
    const timer = window.setTimeout(() => setSad(false), 2400);

    return () => window.clearTimeout(timer);
  }, [error]);

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
    setPwFocus(false);
    setError("");
    setSuccess("");
  }

  /* ---- Where the mascot looks ---- */

  function lookAtElement(el: HTMLElement | null, fraction = 0.5) {
    if (!el) return;
    const r = el.getBoundingClientRect();

    lookAtRef.current = {
      x: r.left + 16 + fraction * Math.max(0, r.width - 32),
      y: r.top + r.height / 2,
    };
    mascotRef.current?.kick();
  }

  function lookAtEmailCaret() {
    const el = emailRef.current;
    if (!el) return;

    // type="email" doesn't expose a caret in some browsers, so fall back to the length.
    const caret = el.selectionStart ?? el.value.length;
    const fraction = clamp((caret * 8.5) / Math.max(1, el.clientWidth - 32), 0, 1);

    lookAtElement(el, fraction);
  }

  function clearLook() {
    lookAtRef.current = null;
    mascotRef.current?.kick();
  }

  /* ---- Pointer lights ---- */

  function onStageMove(e: React.PointerEvent<HTMLDivElement>) {
    const stage = stageRef.current;
    if (!stage) return;

    const r = stage.getBoundingClientRect();
    stage.style.setProperty("--px", `${e.clientX - r.left}px`);
    stage.style.setProperty("--py", `${e.clientY - r.top}px`);
  }

  function onCardMove(e: React.PointerEvent<HTMLDivElement>) {
    const card = cardRef.current;
    if (!card || e.pointerType !== "mouse") return;

    const r = card.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const nx = x / r.width - 0.5;
    const ny = y / r.height - 0.5;

    card.style.setProperty("--mx", `${x}px`);
    card.style.setProperty("--my", `${y}px`);

    if (!reducedRef.current) {
      card.style.setProperty("--rx", `${(-ny * 3).toFixed(2)}deg`);
      card.style.setProperty("--ry", `${(nx * 3).toFixed(2)}deg`);
      card.style.setProperty("--sx", `${(-nx * 26).toFixed(1)}px`);
      card.style.setProperty("--sy", `${(-ny * 16).toFixed(1)}px`);
    }
  }

  function onCardLeave() {
    const card = cardRef.current;
    if (!card) return;

    card.style.setProperty("--mx", "-999px");
    card.style.setProperty("--my", "-999px");
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
    card.style.setProperty("--sx", "0px");
    card.style.setProperty("--sy", "0px");
  }

  function onButtonMove(e: React.PointerEvent<HTMLButtonElement>) {
    const btn = e.currentTarget;
    const r = btn.getBoundingClientRect();

    btn.style.setProperty("--bx", `${e.clientX - r.left}px`);
    btn.style.setProperty("--by", `${e.clientY - r.top}px`);
  }

  const busy = loading || checkingSession;

  const mascotState: MascotState = success
    ? "happy"
    : loading
      ? "busy"
      : pwFocus && !forgot
        ? showPassword
          ? "peek"
          : "cover"
        : sad
          ? "error"
          : emailFocus
            ? "watch"
            : "idle";

  const labelCls =
    "mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors group-focus-within:text-primary";
  const fieldCls =
    "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 disabled:opacity-60";

  return (
    <div
      ref={stageRef}
      className="relative isolate overflow-hidden"
      onPointerMove={onStageMove}
    >
      <style>{MASCOT_STYLES + STYLES}</style>

      {/* Ambient lights behind the page */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="login-spot" />
        <div className="login-orb login-orb-a" />
        <div className="login-orb login-orb-b" />
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl lg:grid-cols-[1fr_minmax(0,28rem)] lg:gap-16 lg:px-8">
        {/* Intro panel (desktop only) */}
        <section className="relative hidden flex-col justify-center overflow-hidden py-16 lg:flex">
          <div className="relative">
            <span
              className="login-rise inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary"
              style={{ animationDelay: "0ms" }}
            >
              <Sparkles className="h-3 w-3" /> Suggestion Hub
            </span>

            <h2
              className="login-rise mt-6 max-w-md text-4xl font-semibold leading-tight tracking-tight sm:text-5xl"
              style={{ animationDelay: "80ms" }}
            >
              Notes your teachers have{" "}
              <span className="login-shimmer">already checked</span>.
            </h2>

            <p
              className="login-rise mt-4 max-w-md leading-relaxed text-muted-foreground"
              style={{ animationDelay: "160ms" }}
            >
              Suggestion Hub brings your course’s notes and exam suggestions into
              one place, so you spend less time hunting and more time studying.
            </p>

            <ul className="mt-10 max-w-md space-y-3">
              {highlights.map(({ icon: Icon, title, text }, i) => (
                <li
                  key={title}
                  className="login-rise group -mx-3 flex gap-4 rounded-2xl p-3 transition-all duration-300 hover:translate-x-1 hover:bg-primary/5"
                  style={{ animationDelay: `${260 + i * 110}ms` }}
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary transition-all duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/40">
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

        {/* Form */}
        <section className="flex flex-col justify-center px-4 py-16 sm:px-8 lg:px-0">
          <div
            ref={cardRef}
            className="login-card relative mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-border/60 bg-card p-7 sm:p-9"
            onPointerMove={onCardMove}
            onPointerLeave={onCardLeave}
          >
            <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />

            <div className="relative z-10">
              <Mascot ref={mascotRef} state={mascotState} lookAtRef={lookAtRef} />

              <h1 className="mt-2 text-center text-3xl font-semibold tracking-tight">
                {forgot ? "Reset your password" : "Welcome back"}
              </h1>

              <p className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">
                {forgot
                  ? "Enter your university email and we’ll send you a reset link."
                  : "Log in with your university email."}
              </p>

              <form className="mt-8 space-y-5" onSubmit={handleLogin} noValidate={false}>
                <div className="group">
                  <label htmlFor="email" className={labelCls}>
                    University email
                  </label>

                  <input
                    ref={emailRef}
                    id="email"
                    name="email"
                    className={fieldCls}
                    type="email"
                    placeholder="you@university.edu"
                    autoComplete="email"
                    autoFocus
                    required
                    disabled={loading}
                    onFocus={() => {
                      setEmailFocus(true);
                      lookAtEmailCaret();
                    }}
                    onBlur={() => {
                      setEmailFocus(false);
                      clearLook();
                    }}
                    onInput={() => {
                      mascotRef.current?.bump();
                      lookAtEmailCaret();
                    }}
                    onKeyUp={lookAtEmailCaret}
                    onClick={lookAtEmailCaret}
                  />
                </div>

                {!forgot && (
                  <div className="group">
                    <div className="flex items-baseline justify-between">
                      <label htmlFor="password" className={labelCls}>
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
                    <div
                      className="relative"
                      onFocus={() => {
                        setPwFocus(true);
                        lookAtElement(pwRef.current, 0.4);
                      }}
                      onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                          setPwFocus(false);
                          clearLook();
                        }
                      }}
                    >
                      <input
                        ref={pwRef}
                        id="password"
                        name="password"
                        className={`${fieldCls} pr-12`}
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        required
                        disabled={loading}
                        onInput={() => mascotRef.current?.bump()}
                      />

                      <button
                        type="button"
                        // Keep focus in the field so the mascot stays in its pose.
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setShowPassword((previous) => !previous);
                          lookAtElement(pwRef.current, 0.4);
                        }}
                        className="absolute inset-y-0 right-0 flex items-center justify-center rounded-r-xl px-3 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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
                    className="animate-in fade-in flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-3.5 text-sm text-destructive"
                    role="alert"
                  >
                    <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div
                    className="animate-in fade-in flex items-start gap-2 rounded-2xl border border-success/30 bg-success/5 p-3.5 text-sm text-success"
                    role="status"
                  >
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{success}</span>
                  </div>
                )}

                <button
                  ref={submitRef}
                  type="submit"
                  disabled={busy}
                  onPointerMove={onButtonMove}
                  onPointerEnter={() => {
                    if (!emailFocus && !pwFocus) lookAtElement(submitRef.current, 0.5);
                  }}
                  onPointerLeave={() => {
                    if (pwFocus) return;
                    if (emailFocus) lookAtEmailCaret();
                    else clearLook();
                  }}
                  className="login-btn group inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/35 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  <span className="relative z-10 inline-flex items-center gap-2">
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
                  </span>
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
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}