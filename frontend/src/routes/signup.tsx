import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import api, { API_URL } from "@/lib/api";
import {
  Mascot,
  MASCOT_STYLES,
  confettiBurst,
  type LookAt,
  type MascotBulb,
  type MascotHandle,
  type MascotOutfit,
  type MascotState,
} from "@/components/mascot";

import {
  MailCheck,
  Eye,
  EyeOff,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Circle,
  LoaderCircle,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign up — Margin" },
      {
        name: "description",
        content:
          "Create your student or teacher account with your university email.",
      },
      { property: "og:title", content: "Sign up — Margin" },
      {
        property: "og:description",
        content: "Join your classmates on Margin.",
      },
    ],
  }),
  component: Signup,
});

type AccountType = "student" | "teacher";

type Department = {
  id: number;
  name: string;
  code: string;
};

const ACCOUNT_TYPES = [
  {
    value: "student" as const,
    label: "Student",
    icon: GraduationCap,
    hint: "Find notes and suggestions for your course.",
  },
  {
    value: "teacher" as const,
    label: "Teacher",
    icon: BookOpen,
    hint: "Review uploads for your courses. Needs admin approval.",
  },
];

const DESIGNATIONS = [
  "Lecturer",
  "Assistant Professor",
  "Associate Professor",
  "Professor",
  "Adjunct Faculty",
  "Other",
];

// What the mascot says when each field is focused.
const FIELD_MESSAGES: Record<string, string> = {
  fullName: "Nice to meet you!",
  email: "Your university email, please.",
  studentId: "Your student ID goes here.",
  intake: "Which intake are you in?",
  section: "And which section?",
  employeeId: "Your faculty ID, please.",
  department: "Pick your department.",
  designation: "What's your title?",
};

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

const labelCls =
  "mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors group-focus-within:text-primary";
const fieldCls =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 disabled:opacity-60";

// Password input with its own show/hide toggle.
function PasswordField({
  id,
  name,
  label,
  value,
  onChange,
  show,
  onToggle,
  describedBy,
  invalid,
  stateClass = "",
  inputRef,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  describedBy: string;
  invalid?: boolean;
  stateClass?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  return (
    <div className="group">
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={name}
          className={`${fieldCls} pr-12 ${stateClass}`}
          type={show ? "text" : "password"}
          autoComplete="new-password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          required
        />

        <button
          type="button"
          data-for={id}
          // Keep focus in the field so the mascot stays in his pose.
          onMouseDown={(event) => event.preventDefault()}
          onClick={onToggle}
          className="absolute inset-y-0 right-0 flex items-center justify-center rounded-r-xl px-3 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={show}
        >
          {show ? (
            <EyeOff className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Eye className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}

const STYLES = `
  /* Page lights */
  .signup-orb { position: absolute; border-radius: 9999px; filter: blur(64px); animation: signup-float 16s ease-in-out infinite; }
  .signup-orb-a { width: 26rem; height: 26rem; left: -8rem; top: 8%; background: hsl(var(--primary) / .18); }
  .signup-orb-b { width: 22rem; height: 22rem; right: -6rem; bottom: 4%; background: hsl(var(--primary) / .14); animation-delay: -6s; animation-direction: alternate-reverse; }
  @keyframes signup-float {
    0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
    50% { transform: translate3d(30px, -24px, 0) scale(1.08); }
  }
  .signup-spot {
    position: absolute;
    inset: 0;
    background: radial-gradient(560px circle at var(--px, 50%) var(--py, 20%), hsl(var(--primary) / .10), transparent 65%);
  }

  .signup-rise { opacity: 0; animation: signup-rise .7s cubic-bezier(.2, .8, .2, 1) forwards; }
  @keyframes signup-rise {
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: none; }
  }

  /* Speech bubble */
  .signup-bubble { animation: signup-bubble .35s cubic-bezier(.2, 1.4, .4, 1) both; transform-origin: left center; }
  .signup-bubble::before {
    content: "";
    display: none;
    position: absolute;
    left: -6px;
    top: 50%;
    width: 12px;
    height: 12px;
    background: inherit;
    border-left: 1px solid hsl(var(--border));
    border-bottom: 1px solid hsl(var(--border));
    transform: translateY(-50%) rotate(45deg);
  }
  @media (min-width: 640px) { .signup-bubble::before { display: block; } }
  @keyframes signup-bubble {
    from { transform: scale(.7) translateX(-8px); opacity: 0; }
    to { transform: none; opacity: 1; }
  }

  /* Account type tiles: tilt toward the pointer, with a moving light */
  .signup-tile {
    position: relative;
    overflow: hidden;
    transform: perspective(700px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
    transition: transform .2s ease-out, box-shadow .25s, border-color .25s, background-color .25s;
  }
  .signup-tile::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(180px circle at var(--mx, -999px) var(--my, -999px), hsl(var(--primary) / .18), transparent 65%);
  }
  .signup-tile:hover { box-shadow: 0 18px 30px -14px hsl(var(--primary) / .4); }
  .signup-tile:active { transform: perspective(700px) scale(.97); }
  .signup-tile:hover .tile-icon { animation: signup-wiggle .6s ease-in-out; }
  @keyframes signup-wiggle {
    0%, 100% { transform: rotate(0deg) scale(1); }
    25% { transform: rotate(-14deg) scale(1.12); }
    60% { transform: rotate(10deg) scale(1.12); }
  }

  /* Form card: a light follows the pointer along the edge */
  .signup-card {
    position: relative;
    overflow: hidden;
    box-shadow:
      0 30px 60px -20px hsl(var(--primary) / .25),
      0 2px 6px rgb(0 0 0 / .08),
      inset 0 1px 0 rgb(255 255 255 / .08);
  }
  .signup-card > * { position: relative; z-index: 1; }
  .signup-card::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 0;
    border-radius: inherit;
    pointer-events: none;
    background: radial-gradient(380px circle at var(--mx, -999px) var(--my, -999px), hsl(var(--primary) / .10), transparent 60%);
  }
  .signup-card::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 2;
    border-radius: inherit;
    padding: 1px;
    pointer-events: none;
    background: radial-gradient(240px circle at var(--mx, -999px) var(--my, -999px), hsl(var(--primary) / .75), transparent 70%);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
  }

  /* Password strength bar and checklist */
  .signup-seg { transition: background-color .25s; transform-origin: center; }
  .signup-seg-on { animation: signup-seg .45s cubic-bezier(.2, 1.6, .4, 1); }
  @keyframes signup-seg {
    0% { transform: scaleY(.4); }
    60% { transform: scaleY(2.2); }
    100% { transform: scaleY(1); }
  }
  .signup-tick { animation: signup-tick .45s cubic-bezier(.2, 1.8, .4, 1) both; }
  @keyframes signup-tick {
    from { transform: scale(0) rotate(-40deg); }
    to { transform: none; }
  }

  /* Submit button light */
  .signup-btn { position: relative; overflow: hidden; }
  .signup-btn::before {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(140px circle at var(--bx, 50%) var(--by, 50%), rgb(255 255 255 / .35), transparent 60%);
    opacity: 0;
    transition: opacity .25s;
  }
  .signup-btn:hover:not(:disabled)::before { opacity: 1; }

  @media (prefers-reduced-motion: reduce) {
    .signup-orb { animation: none; }
    .signup-rise, .signup-bubble, .signup-seg-on, .signup-tick { animation: none; opacity: 1; }
    .signup-tile { transition: none; }
    .signup-tile:hover .tile-icon { animation: none; }
  }
`;

function Signup() {
  // Account and submission state
  const [sent, setSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("student");

  // Department API state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [departmentError, setDepartmentError] = useState("");

  // Password state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Form submission state
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Mascot state
  const [focusId, setFocusId] = useState("");
  const [sad, setSad] = useState(false);
  const [poked, setPoked] = useState(false);

  const mascotRef = useRef<MascotHandle>(null);
  const lookAtRef = useRef<LookAt>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const reducedRef = useRef(false);
  const pokeTimerRef = useRef<number | null>(null);
  const prevStrongRef = useRef(false);
  const prevMatchRef = useRef(false);
  const prevCanSubmitRef = useRef(false);

  // Password requirements
  const passwordRequirements = [
    { label: "8 or more characters", valid: password.length >= 8 },
    { label: "An uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "A lowercase letter", valid: /[a-z]/.test(password) },
    { label: "A number", valid: /[0-9]/.test(password) },
    { label: "A special character", valid: /[^A-Za-z0-9]/.test(password) },
  ];

  const metCount = passwordRequirements.filter((r) => r.valid).length;
  const isStrongPassword = metCount === passwordRequirements.length;

  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;

  const strength =
    password.length === 0
      ? { label: "", bar: "bg-border", text: "text-muted-foreground" }
      : metCount <= 2
        ? { label: "Weak", bar: "bg-red-500", text: "text-red-500" }
        : metCount <= 4
          ? { label: "Almost there", bar: "bg-amber-500", text: "text-amber-600" }
          : { label: "Strong", bar: "bg-green-500", text: "text-green-600" };

  const canSubmit =
    !loading &&
    isStrongPassword &&
    passwordsMatch &&
    !departmentsLoading &&
    !departmentError;

  const submitHint = departmentError
    ? "Refresh the page so we can load the departments."
    : !isStrongPassword
      ? "Make your password strong to unlock the button."
      : !passwordsMatch
        ? "Type the same password again to finish."
        : "";

  // What the mascot is doing, wearing and saying
  const pwFocused = focusId === "password" || focusId === "confirmPassword";
  const revealed = focusId === "password" ? showPassword : showConfirmPassword;
  const textFocused = focusId !== "" && !pwFocused;

  const mascotState: MascotState = sent
    ? "happy"
    : loading
      ? "busy"
      : pwFocused
        ? revealed
          ? "peek"
          : "cover"
        : sad
          ? "error"
          : textFocused
            ? "watch"
            : "idle";

  const outfit: MascotOutfit = accountType === "teacher" ? "glasses" : "cap";

  const bulb: MascotBulb =
    password.length === 0
      ? "default"
      : metCount <= 2
        ? "weak"
        : metCount <= 4
          ? "ok"
          : "strong";

  const bubbleText = poked
    ? "Hehe, that tickles!"
    : sent
      ? accountType === "teacher"
        ? "Welcome aboard, teacher!"
        : "Welcome aboard!"
      : loading
        ? "Setting things up…"
        : sad
          ? "Oops. Let's try that again."
          : focusId === "password"
            ? showPassword
              ? "Okay, I'll peek. Just a little."
              : "I won't look. Promise."
            : focusId === "confirmPassword"
              ? showConfirmPassword
                ? "Peeking again… do they match?"
                : "Type the same one again."
              : (FIELD_MESSAGES[focusId] ??
                (accountType === "teacher"
                  ? "Hello, teacher! Let's get you set up."
                  : "Hi! Let's get you set up."));

  /* ---- Effects ---- */

  useEffect(() => {
    reducedRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    return () => {
      if (pokeTimerRef.current !== null) window.clearTimeout(pokeTimerRef.current);
    };
  }, []);

  // Fetch departments from the backend
  useEffect(() => {
    const controller = new AbortController();

    async function fetchDepartments() {
      try {
        setDepartmentsLoading(true);
        setDepartmentError("");

        // CSRF token request (if your Django backend uses CSRF protection)
        const csrfResponse = await api.get("/accounts/csrf/");

        const response = await fetch(`${API_URL}/academics/departments_list/`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "X-CSRFToken": csrfResponse.data.csrfToken, // Include CSRF token if needed
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(
            `Failed to load departments. HTTP status: ${response.status}`,
          );
        }

        const data: { departments: Department[] } = await response.json();

        if (!Array.isArray(data.departments)) {
          throw new Error("Invalid department data received from the server.");
        }

        setDepartments(data.departments);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          setDepartmentError(
            error.message || "Unable to load departments. Please try again.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setDepartmentsLoading(false);
        }
      }
    }

    fetchDepartments();

    return () => controller.abort();
  }, []);

  const burstFromHero = (count: number) => {
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;

    confettiBurst(
      stageRef.current,
      rect.left + rect.width / 2,
      rect.top + rect.height * 0.4,
      count,
    );
  };

  // Worried face for a moment after an error.
  useEffect(() => {
    if (!submitError) return;

    setSad(true);
    const timer = window.setTimeout(() => setSad(false), 2400);

    return () => window.clearTimeout(timer);
  }, [submitError]);

  // Celebrate the first time the password becomes strong.
  useEffect(() => {
    if (isStrongPassword && !prevStrongRef.current) {
      mascotRef.current?.hop();
      burstFromHero(18);
    }
    prevStrongRef.current = isStrongPassword;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStrongPassword]);

  // And when the two passwords match.
  useEffect(() => {
    if (passwordsMatch && !prevMatchRef.current) {
      mascotRef.current?.hop();
      burstFromHero(10);
    }
    prevMatchRef.current = passwordsMatch;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passwordsMatch]);

  // Shake the confirm field when it's full length but wrong.
  useEffect(() => {
    if (reducedRef.current) return;
    if (confirmPassword.length === 0 || passwordsMatch) return;
    if (confirmPassword.length < password.length) return;

    confirmRef.current?.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-6px)" },
        { transform: "translateX(5px)" },
        { transform: "translateX(-3px)" },
        { transform: "translateX(0)" },
      ],
      { duration: 280, easing: "ease-in-out" },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmPassword]);

  // Nudge the button when it unlocks.
  useEffect(() => {
    if (canSubmit && !prevCanSubmitRef.current && !reducedRef.current) {
      submitRef.current?.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(1.05)" },
          { transform: "scale(1)" },
        ],
        { duration: 420, easing: "ease-out" },
      );
    }
    prevCanSubmitRef.current = canSubmit;
  }, [canSubmit]);

  // Confetti on the success screen.
  useEffect(() => {
    if (!sent) return;

    const timer = window.setTimeout(() => burstFromHero(36), 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sent]);

  /* ---- Where the mascot looks ---- */

  function lookAtElement(el: HTMLElement, fraction = 0.5) {
    const r = el.getBoundingClientRect();

    lookAtRef.current = {
      x: r.left + 16 + fraction * Math.max(0, r.width - 32),
      y: r.top + r.height / 2,
    };
    mascotRef.current?.kick();
  }

  function aimAtField(el: HTMLElement) {
    if (!["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName)) return;

    if (
      el instanceof HTMLInputElement &&
      (el.type === "text" || el.type === "email")
    ) {
      // Follow the caret; type="email" may not expose one, so fall back to the length.
      const caret = el.selectionStart ?? el.value.length;
      lookAtElement(el, clamp((caret * 8.5) / Math.max(1, el.clientWidth - 32), 0, 1));
    } else {
      lookAtElement(el, el.tagName === "INPUT" ? 0.4 : 0.5);
    }
  }

  function clearLook() {
    lookAtRef.current = null;
    mascotRef.current?.kick();
  }

  function onFormFocus(e: React.FocusEvent<HTMLFormElement>) {
    const el = e.target as HTMLElement;
    if (!["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(el.tagName)) return;

    setFocusId(el.dataset.for ?? el.id);
    aimAtField(el);
  }

  function onFormBlur(e: React.FocusEvent<HTMLFormElement>) {
    // Moving between fields keeps the current pose until the next focus event.
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;

    setFocusId("");
    clearLook();
  }

  function poke() {
    mascotRef.current?.hop();
    setPoked(true);

    if (pokeTimerRef.current !== null) window.clearTimeout(pokeTimerRef.current);
    pokeTimerRef.current = window.setTimeout(() => setPoked(false), 1800);
  }

  function chooseType(next: AccountType, el: HTMLElement) {
    mascotRef.current?.hop();

    if (next !== accountType) {
      const r = el.getBoundingClientRect();
      confettiBurst(stageRef.current, r.left + r.width / 2, r.top + r.height / 2, 12);
    }

    setAccountType(next);
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
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  }

  function onCardLeave() {
    const card = cardRef.current;
    if (!card) return;

    card.style.setProperty("--mx", "-999px");
    card.style.setProperty("--my", "-999px");
  }

  function onTileMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (e.pointerType !== "mouse") return;

    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;

    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y}px`);

    if (!reducedRef.current) {
      el.style.setProperty("--rx", `${((y / r.height - 0.5) * -8).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${((x / r.width - 0.5) * 8).toFixed(2)}deg`);
    }
  }

  function onTileLeave(e: React.PointerEvent<HTMLButtonElement>) {
    const el = e.currentTarget;

    el.style.setProperty("--mx", "-999px");
    el.style.setProperty("--my", "-999px");
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }

  function onButtonMove(e: React.PointerEvent<HTMLButtonElement>) {
    const btn = e.currentTarget;
    const r = btn.getBoundingClientRect();

    btn.style.setProperty("--bx", `${e.clientX - r.left}px`);
    btn.style.setProperty("--by", `${e.clientY - r.top}px`);
  }

  // Handle form submission
  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");

    if (!isStrongPassword || !passwordsMatch) {
      setSubmitError("Please check your password and try again.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();

    const payload = {
      accountType,
      fullName: String(formData.get("fullName") ?? "").trim(),
      email,
      password,
      confirmPassword,

      // Student information
      studentId: String(formData.get("studentId") ?? ""),
      departmentId: String(formData.get("departmentId") ?? ""),
      intake: String(formData.get("intake") ?? ""),
      section: String(formData.get("section") ?? ""),

      // Teacher information
      employeeId: String(formData.get("employeeId") ?? ""),
      designation: String(formData.get("designation") ?? ""),
    };

    try {
      setLoading(true);

      // CSRF token request (if your Django backend uses CSRF protection)
      const csrfResponse = await api.get("/accounts/csrf/");

      // sign up request
      const response = await fetch(`${API_URL}/accounts/signup/`, {
        method: "POST",
        credentials: "include", // Include cookies for session authentication
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRFToken": csrfResponse.data.csrfToken, // Include CSRF token if needed
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = Array.isArray(data.error)
          ? data.error.join(" ")
          : data.error || "Registration failed.";

        throw new Error(message);
      }

      setSubmittedEmail(email);
      setSent(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to connect to the server.",
      );
    } finally {
      setLoading(false);
    }
  }

  const departmentSelect = (
    <div className="group">
      <label htmlFor="department" className={labelCls}>
        Department
      </label>

      <select
        id="department"
        name="departmentId"
        className={fieldCls}
        defaultValue=""
        required
        disabled={departmentsLoading || !!departmentError || loading}
      >
        <option value="" disabled>
          {departmentsLoading
            ? "Loading departments..."
            : departmentError
              ? "Failed to load departments"
              : "Select your department"}
        </option>

        {departments.map((department) => (
          <option key={department.id} value={department.id}>
            {department.name} ({department.code})
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div
      ref={stageRef}
      className="relative isolate overflow-hidden"
      onPointerMove={onStageMove}
    >
      <style>{MASCOT_STYLES + STYLES}</style>

      {/* Ambient lights behind the page */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="signup-spot" />
        <div className="signup-orb signup-orb-a" />
        <div className="signup-orb signup-orb-b" />
      </div>

      <div className="mx-auto max-w-xl px-4 py-12 sm:py-16">
        {/* Mascot and speech bubble */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:flex-nowrap">
          <div
            ref={heroRef}
            onClick={poke}
            className="cursor-pointer select-none"
          >
            <Mascot
              ref={mascotRef}
              state={mascotState}
              lookAtRef={lookAtRef}
              outfit={outfit}
              bulb={bulb}
            />
          </div>

          <div
            key={bubbleText}
            className="signup-bubble relative max-w-[16rem] rounded-2xl border border-border bg-card px-4 py-2.5 text-sm font-medium shadow-lg shadow-primary/10"
            role="status"
          >
            {bubbleText}
          </div>
        </div>

        {sent ? (
          /* Verification confirmation */
          <div className="signup-rise mt-6 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
              <MailCheck className="h-6 w-6" aria-hidden="true" />
            </span>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight">
              Check your inbox
            </h1>

            <p className="mx-auto mt-3 max-w-sm leading-relaxed text-muted-foreground">
              {accountType === "teacher" ? (
                <>
                  We received your registration
                  {submittedEmail && (
                    <>
                      {" "}
                      for <span className="font-medium text-foreground">{submittedEmail}</span>
                    </>
                  )}
                  . An administrator needs to approve teacher accounts before you
                  can log in.
                </>
              ) : (
                <>
                  We sent a verification link to{" "}
                  <span className="font-medium text-foreground">
                    {submittedEmail || "your university email"}
                  </span>
                  . Open it to activate your account.
                </>
              )}
            </p>

            <Link
              to="/login"
              className="mt-8 inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
            >
              Back to log in
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <>
            <header className="signup-rise mt-6 text-center">
              <h1 className="text-4xl font-semibold tracking-tight">
                Create your account
              </h1>

              <p className="mt-3 leading-relaxed text-muted-foreground">
                Join Margin and connect with your university community.
              </p>
            </header>

            {/* Account type tiles */}
            <div
              className="signup-rise mt-8 grid gap-3 sm:grid-cols-2"
              style={{ animationDelay: "100ms" }}
              role="group"
              aria-label="Account type"
            >
              {ACCOUNT_TYPES.map(({ value, label, icon: Icon, hint }) => {
                const active = accountType === value;

                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    disabled={loading}
                    onClick={(e) => chooseType(value, e.currentTarget)}
                    onPointerMove={onTileMove}
                    onPointerLeave={onTileLeave}
                    className={`signup-tile flex items-start gap-3 rounded-2xl border p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                      active
                        ? "border-primary bg-primary/5 shadow-lg shadow-primary/20"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <span
                      className={`tile-icon grid h-11 w-11 shrink-0 place-items-center rounded-2xl transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>

                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        {label}
                        {active && <CheckCircle2 className="signup-tick h-4 w-4 text-primary" />}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                        {hint}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Signup form */}
            <div
              ref={cardRef}
              className="signup-card signup-rise mt-6 rounded-3xl border border-border/60 bg-card"
              style={{ animationDelay: "180ms" }}
              onPointerMove={onCardMove}
              onPointerLeave={onCardLeave}
            >
              <form
                key={accountType}
                className="divide-y divide-border"
                onSubmit={handleSignup}
                onFocus={onFormFocus}
                onBlur={onFormBlur}
                onInput={(e) => {
                  mascotRef.current?.bump();
                  aimAtField(e.target as HTMLElement);
                }}
                onKeyUp={(e) => aimAtField(e.target as HTMLElement)}
                onClick={(e) => aimAtField(e.target as HTMLElement)}
              >
                {/* Your details */}
                <section className="grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
                  <div className="sm:col-span-2">
                    <h2 className="text-lg font-semibold">Your details</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {accountType === "student"
                        ? "We use these to show you notes for your class."
                        : "We use these to verify your faculty account."}
                    </p>
                  </div>

                  <div className="group sm:col-span-2">
                    <label htmlFor="fullName" className={labelCls}>
                      Full name
                    </label>

                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      className={fieldCls}
                      placeholder="Enter your full name"
                      autoComplete="name"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="group sm:col-span-2">
                    <label htmlFor="email" className={labelCls}>
                      University email
                    </label>

                    <input
                      id="email"
                      name="email"
                      type="email"
                      className={fieldCls}
                      placeholder="you@university.edu"
                      autoComplete="email"
                      required
                      disabled={loading}
                    />
                  </div>

                  {/* Student-specific fields */}
                  {accountType === "student" && (
                    <>
                      <div className="group">
                        <label htmlFor="studentId" className={labelCls}>
                          Student ID
                        </label>

                        <input
                          id="studentId"
                          name="studentId"
                          type="text"
                          className={fieldCls}
                          placeholder="Enter student ID"
                          required
                          disabled={loading}
                        />
                      </div>

                      {departmentSelect}

                      <div className="group">
                        <label htmlFor="intake" className={labelCls}>
                          Intake
                        </label>

                        <input
                          id="intake"
                          name="intake"
                          type="text"
                          inputMode="numeric"
                          className={fieldCls}
                          placeholder="e.g. 52"
                          required
                          disabled={loading}
                        />
                      </div>

                      <div className="group">
                        <label htmlFor="section" className={labelCls}>
                          Section
                        </label>

                        <input
                          id="section"
                          name="section"
                          type="text"
                          className={fieldCls}
                          placeholder="e.g. 11"
                          required
                          disabled={loading}
                        />
                      </div>
                    </>
                  )}

                  {/* Teacher-specific fields */}
                  {accountType === "teacher" && (
                    <>
                      <div className="group sm:col-span-2">
                        <label htmlFor="employeeId" className={labelCls}>
                          Employee / Faculty ID
                        </label>

                        <input
                          id="employeeId"
                          name="employeeId"
                          type="text"
                          className={fieldCls}
                          placeholder="Enter your employee ID"
                          autoComplete="off"
                          aria-describedby="employee-id-hint"
                          required
                          disabled={loading}
                        />

                        <p
                          id="employee-id-hint"
                          className="mt-1.5 text-xs text-muted-foreground"
                        >
                          The ID your university assigned to you.
                        </p>
                      </div>

                      {departmentSelect}

                      <div className="group">
                        <label htmlFor="designation" className={labelCls}>
                          Designation
                        </label>

                        <select
                          id="designation"
                          name="designation"
                          className={fieldCls}
                          defaultValue=""
                          required
                          disabled={loading}
                        >
                          <option value="" disabled>
                            Select designation
                          </option>
                          {DESIGNATIONS.map((designation) => (
                            <option key={designation} value={designation}>
                              {designation}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Teacher approval notice */}
                      <div className="flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 sm:col-span-2">
                        <ShieldAlert
                          className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
                          aria-hidden="true"
                        />

                        <div>
                          <p className="text-sm font-medium">
                            An administrator will approve your account
                          </p>

                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            We verify faculty information with the university before
                            your account is activated. You’ll be able to log in once
                            it’s approved.
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Department API error */}
                  {departmentError && (
                    <div
                      className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-3.5 sm:col-span-2"
                      role="alert"
                    >
                      <AlertCircle
                        size={18}
                        className="mt-0.5 shrink-0 text-destructive"
                        aria-hidden="true"
                      />

                      <div>
                        <p className="text-sm text-destructive">
                          Could not load departments: {departmentError}
                        </p>

                        <button
                          type="button"
                          className="mt-1.5 text-sm font-medium text-primary hover:underline"
                          onClick={() => {
                            // A page refresh reruns the department-loading effect.
                            window.location.reload();
                          }}
                        >
                          Refresh the page and try again
                        </button>
                      </div>
                    </div>
                  )}
                </section>

                {/* Password */}
                <section className="grid gap-5 p-6 sm:p-8">
                  <div>
                    <h2 className="text-lg font-semibold">Password</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Choose something you don’t use anywhere else.
                    </p>
                  </div>

                  <div>
                    <PasswordField
                      id="password"
                      name="password"
                      label="Password"
                      value={password}
                      onChange={setPassword}
                      show={showPassword}
                      onToggle={() => setShowPassword((previous) => !previous)}
                      describedBy="password-requirements"
                    />

                    <div id="password-requirements" aria-live="polite" className="mt-3">
                      {/* Strength meter */}
                      <div className="flex items-center gap-3">
                        <div className="flex flex-1 gap-1.5" aria-hidden="true">
                          {passwordRequirements.map((requirement, index) => {
                            const on = index < metCount;

                            return (
                              <span
                                key={requirement.label}
                                className={`signup-seg h-1.5 flex-1 rounded-full ${
                                  on ? `${strength.bar} signup-seg-on` : "bg-border"
                                }`}
                              />
                            );
                          })}
                        </div>

                        <span
                          className={`min-w-[5.5rem] text-right text-xs font-medium ${strength.text}`}
                        >
                          {strength.label}
                        </span>
                      </div>

                      {/* Requirement checklist */}
                      <ul className="mt-3 grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
                        {passwordRequirements.map((requirement) => (
                          <li
                            key={requirement.label}
                            className={`flex items-center gap-2 text-xs transition-colors ${
                              requirement.valid
                                ? "text-green-600"
                                : "text-muted-foreground"
                            }`}
                          >
                            {requirement.valid ? (
                              <CheckCircle2
                                className="signup-tick h-4 w-4 shrink-0"
                                aria-hidden="true"
                              />
                            ) : (
                              <Circle className="h-4 w-4 shrink-0 text-border" aria-hidden="true" />
                            )}

                            {requirement.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div>
                    <PasswordField
                      id="confirmPassword"
                      name="confirmPassword"
                      label="Confirm password"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      show={showConfirmPassword}
                      onToggle={() => setShowConfirmPassword((previous) => !previous)}
                      describedBy="confirm-password-feedback"
                      invalid={confirmPassword.length > 0 && !passwordsMatch}
                      inputRef={confirmRef}
                      stateClass={
                        confirmPassword.length > 0
                          ? passwordsMatch
                            ? "border-green-500 focus:border-green-500 focus:ring-green-500/15"
                            : "border-red-500 focus:border-red-500 focus:ring-red-500/15"
                          : ""
                      }
                    />

                    <p
                      id="confirm-password-feedback"
                      className={`mt-2 text-xs ${
                        confirmPassword.length === 0
                          ? "text-muted-foreground"
                          : passwordsMatch
                            ? "text-green-600"
                            : "text-red-500"
                      }`}
                      aria-live="polite"
                    >
                      {confirmPassword.length === 0
                        ? "Re-enter your password to confirm it."
                        : passwordsMatch
                          ? "Passwords match."
                          : "Passwords don’t match yet."}
                    </p>
                  </div>
                </section>

                {/* Actions */}
                <section className="grid gap-4 p-6 sm:p-8">
                  {submitError && (
                    <div
                      className="animate-in fade-in flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-3.5"
                      role="alert"
                    >
                      <AlertCircle
                        size={18}
                        className="mt-0.5 shrink-0 text-destructive"
                        aria-hidden="true"
                      />
                      <p className="text-sm text-destructive">{submitError}</p>
                    </div>
                  )}

                  <button
                    ref={submitRef}
                    type="submit"
                    disabled={!canSubmit}
                    onPointerMove={onButtonMove}
                    className="signup-btn group inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/35 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    <span className="relative z-10 inline-flex items-center gap-2">
                      {loading ? (
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
                        ? "Creating account…"
                        : accountType === "student"
                          ? "Create student account"
                          : "Register as teacher"}
                    </span>
                  </button>

                  {submitHint && !loading && (
                    <p className="text-center text-xs text-muted-foreground" aria-live="polite">
                      {submitHint}
                    </p>
                  )}

                  <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link
                      to="/login"
                      className="font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      Log in
                    </Link>
                  </p>
                </section>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}