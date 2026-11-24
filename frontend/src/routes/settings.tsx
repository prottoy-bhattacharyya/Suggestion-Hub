import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import axios from "axios";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  Save,
  Settings as SettingsIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import api from "@/lib/api";
import { getSessionUser, notifyAuthChange, type SessionUser } from "@/lib/auth";
import { getCSRFToken } from "@/lib/utils";

type Department = {
  id: number;
  name: string;
  code: string;
};

type SettingsUser = SessionUser & {
  student_id?: string | null;
  department_id?: number | null;
  intake?: string | null;
  section?: string | null;
  designation?: string | null;
  employee_id?: string | null;
};

type FormState = {
  fullName: string;
  email: string;
  departmentId: string;
  studentId: string;
  section: string;
};

const emptyForm: FormState = {
  fullName: "",
  email: "",
  departmentId: "",
  studentId: "",
  section: "",
};

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Suggestion Hub" },
      { name: "description", content: "Update your account information." },
    ],
  }),
  beforeLoad: async () => {
    const user = await getSessionUser();
    if (!user) throw redirect({ to: "/login" });
  },
  component: SettingsPage,
});

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15";
const labelClass = "text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground";

function SettingsPage() {
  const [user, setUser] = useState<SettingsUser | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        const [meResponse, departmentsResponse] = await Promise.all([
          api.get("/accounts/me/"),
          api.get<{ departments: Department[] }>("/academics/departments_list/"),
        ]);

        if (!active) return;

        if (!meResponse.data.loggedIn || !meResponse.data.user) {
          throw new Error("Please log in to change your settings.");
        }

        const loadedUser = meResponse.data.user as SettingsUser;
        setUser(loadedUser);
        setDepartments(departmentsResponse.data.departments ?? []);
        setForm({
          fullName: loadedUser.full_name ?? "",
          email: loadedUser.email ?? "",
          departmentId:
            loadedUser.department_id === null || loadedUser.department_id === undefined
              ? ""
              : String(loadedUser.department_id),
          studentId: loadedUser.student_id ?? "",
          section: loadedUser.section ?? "",
        });
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load your settings.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSettings();
    return () => {
      active = false;
    };
  }, []);

  const isStudent = user?.role === "student";

  function updateField(key: keyof FormState, value: string) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.fullName.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }

    setSaving(true);

    try {
      const csrfToken = await getCSRFToken();
      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        departmentId: form.departmentId ? Number(form.departmentId) : null,
        ...(isStudent
          ? {
              studentId: form.studentId.trim(),
              section: form.section.trim(),
            }
          : {}),
      };

      const response = await api.post("/accounts/profile/update/", payload, {
        headers: {
          Accept: "application/json",
          ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
        },
      });

      const updatedUser = response.data.user as SettingsUser;
      setUser(updatedUser);
      setForm({
        fullName: updatedUser.full_name ?? "",
        email: updatedUser.email ?? "",
        departmentId:
          updatedUser.department_id === null || updatedUser.department_id === undefined
            ? ""
            : String(updatedUser.department_id),
        studentId: updatedUser.student_id ?? "",
        section: updatedUser.section ?? "",
      });
      setSuccess("Your settings have been saved.");
      notifyAuthChange();
    } catch (err) {
      setError(
        axios.isAxiosError(err)
          ? (err.response?.data?.message ??
              err.response?.data?.error ??
              "Unable to save your settings.")
          : "Unable to save your settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        to="/profile/$id"
        params={{ id: "me" }}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to profile
      </Link>

      <div className="mt-6 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
          <SettingsIcon className="size-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Account settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Update the information other members see on your profile.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="mt-6 rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur sm:p-8">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Loading your settings…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="settings-name">
                  Full name
                </label>
                <input
                  id="settings-name"
                  className={fieldClass}
                  value={form.fullName}
                  onChange={(event) => updateField("fullName", event.target.value)}
                  maxLength={150}
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="settings-email">
                  Email
                </label>
                <input
                  id="settings-email"
                  type="email"
                  className={fieldClass}
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  maxLength={254}
                  required
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Email changes take effect immediately.
                </p>
              </div>
            </section>

            <section>
              <label className={labelClass} htmlFor="settings-department">
                Department
              </label>
              <select
                id="settings-department"
                className={fieldClass}
                value={form.departmentId}
                onChange={(event) => updateField("departmentId", event.target.value)}
              >
                <option value="">No department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name} ({department.code})
                  </option>
                ))}
              </select>
              {user?.role === "teacher" && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Changing your department refreshes your department ranking.
                </p>
              )}
            </section>

            {isStudent && (
              <section className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="settings-student-id">
                    Student ID
                  </label>
                  <input
                    id="settings-student-id"
                    className={fieldClass}
                    value={form.studentId}
                    onChange={(event) => updateField("studentId", event.target.value)}
                    maxLength={30}
                    placeholder="e.g. 20240001"
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="settings-section">
                    Section
                  </label>
                  <input
                    id="settings-section"
                    className={fieldClass}
                    value={form.section}
                    onChange={(event) => updateField("section", event.target.value)}
                    maxLength={10}
                    placeholder="e.g. A"
                  />
                </div>
              </section>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-border/60 pt-6">
              <Link
                to="/profile/$id"
                params={{ id: "me" }}
                className="rounded-full px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-wait disabled:opacity-70"
              >
                {saving ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
