import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import api, { API_URL } from "@/lib/api";

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

type Department = {
  id: number;
  name: string;
  code: string;
};

function Signup() {
  // Account and submission state
  const [sent, setSent] = useState(false);
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
            `Failed to load departments. HTTP status: ${response.status}`
          );
        }

        const data: { departments: Department[] } =
          await response.json();

        if (!Array.isArray(data.departments)) {
          throw new Error("Invalid department data received from the server.");
        }

        setDepartments(data.departments);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          setDepartmentError(
            error.message ||
              "Unable to load departments. Please try again."
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


  // Password requirements
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

    const payload = {
      accountType,
      fullName: String(formData.get("fullName") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
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

    // CSRF token request (if your Django backend uses CSRF protection)
    const csrfResponse = await api.get("/accounts/csrf/");

    // sign up request
    try {
      setLoading(true);

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

      setSent(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  }

  // Verification confirmation screen
  if (sent) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <MailCheck className="mx-auto h-12 w-12 text-primary" />

        <h1 className="mt-4 text-3xl font-semibold">
          Check your inbox
        </h1>

        <p className="mt-2 text-muted-foreground">
          Your registration form was submitted locally.
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
        onSubmit={handleSignup}
      >
        {/* Full name */}
        <div className="sm:col-span-2">
          <label htmlFor="fullName" className="label-sm">
            Full name
          </label>

          <input
            id="fullName"
            name="fullName"
            type="text"
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
            type="email"
            className="field w-full"
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
                type="text"
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
                name="departmentId"
                className="field w-full"
                defaultValue=""
                required
                disabled={departmentsLoading || !!departmentError}
              >
                <option value="" disabled>
                  {departmentsLoading
                    ? "Loading departments..."
                    : departmentError
                      ? "Failed to load departments"
                      : "Select your department"}
                </option>

                {departments.map((department) => (
                  <option
                    key={department.id}
                    value={department.id}
                  >
                    {department.name} ({department.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="intake" className="label-sm">
                Intake
              </label>

              <input
                id="intake"
                name="intake"
                type="text"
                className="field w-full"
                placeholder="e.g. 52"
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
                type="text"
                className="field w-full"
                placeholder="e.g. 11"
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
                type="text"
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
              <label htmlFor="teacherDepartment" className="label-sm">
                Department
              </label>

              <select
                id="teacherDepartment"
                name="departmentId"
                className="field w-full"
                defaultValue=""
                required
                disabled={departmentsLoading || !!departmentError}
              >
                <option value="" disabled>
                  {departmentsLoading
                    ? "Loading departments..."
                    : departmentError
                      ? "Failed to load departments"
                      : "Select your department"}
                </option>

                {departments.map((department) => (
                  <option
                    key={department.id}
                    value={department.id}
                  >
                    {department.name} ({department.code})
                  </option>
                ))}
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

        {/* Department API error */}
        {departmentError && (
          <div
            className="sm:col-span-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3"
            role="alert"
          >
            <p className="text-sm text-red-500">
              Could not load departments: {departmentError}
            </p>

            <button
              type="button"
              className="mt-2 text-sm font-medium text-primary hover:underline"
              onClick={() => {
                // A page refresh reruns the department-loading effect.
                window.location.reload();
              }}
            >
              Refresh page and try again
            </button>
          </div>
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
              onChange={(event) => setPassword(event.target.value)}
              aria-describedby="password-requirements"
              required
            />

            <button
              type="button"
              onClick={() => setShowPassword((previous) => !previous)}
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
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              aria-invalid={
                confirmPassword.length > 0 && !passwordsMatch
              }
              aria-describedby="confirm-password-feedback"
              required
            />

            <button
              type="button"
              onClick={() =>
                setShowConfirmPassword((previous) => !previous)
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
        
        {submitError && (
          <div
            className="sm:col-span-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3"
            role="alert"
          >
            <p className="text-sm text-red-500">{submitError}</p>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={
            loading ||
            !isStrongPassword ||
            !passwordsMatch ||
            departmentsLoading ||
            !!departmentError
          }
          className="btn-primary sm:col-span-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Creating account..."
            : accountType === "student"
              ? "Create student account"
              : "Register as teacher"}
            
        </button>

        {/* Login link */}
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