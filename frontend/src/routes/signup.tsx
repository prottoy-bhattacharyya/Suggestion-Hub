import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  MailCheck,
  Eye,
  EyeOff,
  GraduationCap,
  BookOpen,
  CheckCircle2,
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

function Signup() {
  const [sent, setSent] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("student");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordRequirements = [
    {
      label: "At least 8 characters",
      valid: password.length >= 8,
    },
    {
      label: "One uppercase letter (A-Z)",
      valid: /[A-Z]/.test(password),
    },
    {
      label: "One lowercase letter (a-z)",
      valid: /[a-z]/.test(password),
    },
    {
      label: "One number (0-9)",
      valid: /[0-9]/.test(password),
    },
    {
      label: "One special character (!@#$...)",
      valid: /[^A-Za-z0-9]/.test(password),
    },
  ];

  const isStrongPassword = passwordRequirements.every(
    (requirement) => requirement.valid
  );

  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;

  if (sent) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <MailCheck className="mx-auto h-12 w-12 text-primary" />

        <h1 className="mt-4 text-3xl">Check your inbox</h1>

        <p className="mt-2 text-muted-foreground">
          Your registration request has been submitted.
          {accountType === "teacher"
            ? " Teacher accounts require administrative approval."
            : " Check your university email for verification instructions."}
        </p>

        <Link to="/login" className="btn-ghost mt-6 inline-block">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      {/* Page heading */}
      <div>
        <h1 className="text-3xl font-semibold">
          Create your account
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Join Margin and connect with your university community.
        </p>
      </div>

      {/* Account type selector */}
      <div className="paper-card mt-6 p-2">
        <p className="px-3 pb-2 pt-1 text-sm font-medium">
          Choose your account type
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setAccountType("student")}
            aria-pressed={accountType === "student"}
            className={`flex items-center justify-center gap-2 rounded-lg border p-4 text-sm font-medium transition-colors ${
              accountType === "student"
                ? "border-primary bg-accent text-primary"
                : "border-transparent text-muted-foreground hover:bg-accent/50"
            }`}
          >
            <GraduationCap className="h-5 w-5" />
            Student
          </button>

          <button
            type="button"
            onClick={() => setAccountType("teacher")}
            aria-pressed={accountType === "teacher"}
            className={`flex items-center justify-center gap-2 rounded-lg border p-4 text-sm font-medium transition-colors ${
              accountType === "teacher"
                ? "border-primary bg-accent text-primary"
                : "border-transparent text-muted-foreground hover:bg-accent/50"
            }`}
          >
            <BookOpen className="h-5 w-5" />
            Teacher
          </button>
        </div>
      </div>

      {/* Account type information */}
      <div className="mt-4 rounded-lg border p-4">
        <div className="flex items-start gap-3">
          {accountType === "student" ? (
            <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          ) : (
            <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          )}

          <div>
            <p className="font-medium">
              {accountType === "student"
                ? "Student registration"
                : "Teacher registration"}
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {accountType === "student"
                ? "Register with your student information to join your university community."
                : "Register with your faculty information. Teacher accounts require administrative approval."}
            </p>
          </div>
        </div>
      </div>

      {/* Signup form */}
      <form
        key={accountType}
        className="paper-card mt-6 grid gap-4 p-6 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();

          if (!isStrongPassword || !passwordsMatch) {
            return;
          }

          // Connect your authentication API here.
          // Send accountType along with the submitted form data.
          setSent(true);
        }}
      >
        {/* Full name */}
        <div className="sm:col-span-2">
          <label htmlFor="fullName" className="label-sm">
            Full name
          </label>

          <input
            id="fullName"
            name="fullName"
            className="field w-full"
            placeholder="Enter your full name"
            autoComplete="name"
            required
          />
        </div>

        {/* University email */}
        <div className="sm:col-span-2">
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
            required
          />
        </div>

        {/* Student-specific fields */}
        {accountType === "student" && (
          <>
            <div>
              <label htmlFor="studentId" className="label-sm">
                Student ID
              </label>

              <input
                id="studentId"
                name="studentId"
                className="field w-full"
                placeholder="Enter student ID"
                required
              />
            </div>

            <div>
              <label htmlFor="studentDepartment" className="label-sm">
                Department
              </label>

              <select
                id="studentDepartment"
                name="department"
                className="field w-full"
                defaultValue="CSE"
                required
              >
                <option value="CSE">CSE</option>
                <option value="EEE">EEE</option>
                <option value="BBA">BBA</option>
              </select>
            </div>

            <div>
              <label htmlFor="intake" className="label-sm">
                Intake
              </label>

              <input
                id="intake"
                name="intake"
                className="field w-full"
                placeholder="e.g. 49"
                required
              />
            </div>

            <div>
              <label htmlFor="section" className="label-sm">
                Section
              </label>

              <input
                id="section"
                name="section"
                className="field w-full"
                placeholder="e.g. 3"
                required
              />
            </div>
          </>
        )}

        {/* Teacher-specific fields */}
        {accountType === "teacher" && (
          <>
            <div className="sm:col-span-2">
              <label htmlFor="employeeId" className="label-sm">
                Employee / Faculty ID
              </label>

              <input
                id="employeeId"
                name="employeeId"
                className="field w-full"
                placeholder="Enter your employee ID"
                autoComplete="off"
                required
              />

              <p className="mt-1 text-xs text-muted-foreground">
                Enter the ID assigned to you by your university.
              </p>
            </div>

            <div>
              <label
                htmlFor="teacherDepartment"
                className="label-sm"
              >
                Department
              </label>

              <select
                id="teacherDepartment"
                name="department"
                className="field w-full"
                defaultValue="CSE"
                required
              >
                <option value="CSE">CSE</option>
                <option value="EEE">EEE</option>
                <option value="BBA">BBA</option>
              </select>
            </div>

            <div>
              <label htmlFor="designation" className="label-sm">
                Designation
              </label>

              <select
                id="designation"
                name="designation"
                className="field w-full"
                defaultValue=""
                required
              >
                <option value="" disabled>
                  Select designation
                </option>
                <option value="Lecturer">Lecturer</option>
                <option value="Assistant Professor">
                  Assistant Professor
                </option>
                <option value="Associate Professor">
                  Associate Professor
                </option>
                <option value="Professor">Professor</option>
                <option value="Adjunct Faculty">
                  Adjunct Faculty
                </option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Teacher approval notice */}
            <div className="sm:col-span-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="text-sm font-medium">
                Administrative approval required
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Your faculty information may need to be verified by
                the university administrator before your account is
                activated.
              </p>
            </div>
          </>
        )}

        {/* Password */}
        <div className="sm:col-span-2">
          <label htmlFor="password" className="label-sm">
            Password
          </label>

          <div className="relative">
            <input
              id="password"
              name="password"
              className="field w-full pr-12"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby="password-requirements"
              required
            />

            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={
                showPassword ? "Hide password" : "Show password"
              }
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Password strength requirements */}
          <div
            id="password-requirements"
            className="mt-3 space-y-2"
            aria-live="polite"
          >
            <p className="text-sm font-medium">
              Password requirements
            </p>

            {passwordRequirements.map((requirement) => (
              <div
                key={requirement.label}
                className={`flex items-center gap-2 text-xs ${
                  requirement.valid
                    ? "text-green-600"
                    : "text-muted-foreground"
                }`}
              >
                {requirement.valid ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <span
                    className="inline-block h-4 w-4 shrink-0 text-center"
                    aria-hidden="true"
                  >
                    ○
                  </span>
                )}

                {requirement.label}
              </div>
            ))}

            {password.length > 0 && (
              <p
                className={`pt-1 text-xs font-medium ${
                  isStrongPassword
                    ? "text-green-600"
                    : "text-amber-600"
                }`}
              >
                {isStrongPassword
                  ? "✓ Strong password"
                  : "Your password needs improvement"}
              </p>
            )}
          </div>
        </div>

        {/* Confirm password */}
        <div className="sm:col-span-2">
          <label htmlFor="confirmPassword" className="label-sm">
            Confirm password
          </label>

          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              className={`field w-full pr-12 ${
                confirmPassword.length > 0
                  ? passwordsMatch
                    ? "border-green-500"
                    : "border-red-500"
                  : ""
              }`}
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-invalid={
                confirmPassword.length > 0 && !passwordsMatch
              }
              aria-describedby="confirm-password-feedback"
              required
            />

            <button
              type="button"
              onClick={() =>
                setShowConfirmPassword((prev) => !prev)
              }
              className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={
                showConfirmPassword
                  ? "Hide confirm password"
                  : "Show confirm password"
              }
              aria-pressed={showConfirmPassword}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>

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
                ? "✓ Passwords match"
                : "✗ Passwords do not match"}
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!isStrongPassword || !passwordsMatch}
          className="btn-primary sm:col-span-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {accountType === "student"
            ? "Create student account"
            : "Register as teacher"}
        </button>

        <p className="sm:col-span-2 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-primary hover:underline"
          >
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
