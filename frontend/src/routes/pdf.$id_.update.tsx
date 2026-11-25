import { createFileRoute, Link, notFound, useNavigate, useRouter } from "@tanstack/react-router";
import axios from "axios";
import { AlertCircle, ArrowLeft, FileText, LoaderCircle, Save, UploadCloud } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import api from "@/lib/api";
import { updateNote } from "@/lib/utils";

type NoteDetail = {
  id: number;
  title: string;
  description: string | null;
  type: "note" | "suggestion";
  intake: string;
  section: string | null;
  course_id: number | null;
  course_code: string | null;
  review_status: "pending" | "approved" | "rejected";
  file_type?: "pdf" | "video";
  is_owner: boolean;
};

type Course = {
  id: number;
  code: string;
  title: string;
};

export const Route = createFileRoute("/pdf/$id_/update")({
  loader: async ({ params }) => {
    const noteId = Number.parseInt(params.id.replace(/\D/g, ""), 10);

    if (!Number.isFinite(noteId)) {
      throw notFound();
    }

    try {
      const { data } = await api.get(`/notes/${noteId}/detail/`);
      if (!data.note?.is_owner) {
        throw notFound();
      }
      return { note: data.note as NoteDetail };
    } catch {
      throw notFound();
    }
  },

  head: () => ({
    meta: [
      { title: "Update note — Suggestion Hub" },
      { name: "description", content: "Update your note details or replace its file." },
    ],
  }),

  component: UpdateNotePage,
});

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60";
const labelClass = "text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground";

function UpdateNotePage() {
  const { note } = Route.useLoaderData();
  const router = useRouter();
  const navigate = useNavigate();

  const [title, setTitle] = useState(note.title);
  const [description, setDescription] = useState(note.description ?? "");
  const [type, setType] = useState<"note" | "suggestion">(note.type);
  const [courseId, setCourseId] = useState(String(note.course_id ?? ""));
  const [intake, setIntake] = useState(note.intake);
  const [section, setSection] = useState(note.section ?? "");
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState("");
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadCourses() {
      try {
        const { data } = await api.get("/academics/courses_list/");
        if (active) {
          setCourses(data.courses ?? []);
          setCoursesError("");
        }
      } catch (loadError: unknown) {
        if (active) {
          setCoursesError(
            axios.isAxiosError(loadError)
              ? (loadError.response?.data?.error ?? "Could not load courses.")
              : "Could not load courses.",
          );
        }
      } finally {
        if (active) {
          setCoursesLoading(false);
        }
      }
    }

    void loadCourses();
    return () => {
      active = false;
    };
  }, []);

  function chooseReplacementFile(file: File | null) {
    setError("");

    if (!file) {
      setReplacementFile(null);
      return;
    }

    const name = file.name.toLowerCase();
    const isPdf = name.endsWith(".pdf");
    const isVideo = name.endsWith(".mp4") || name.endsWith(".webm") || name.endsWith(".mov");

    if (!isPdf && !isVideo) {
      setError("Only PDF, MP4, WEBM, and MOV files are allowed.");
      setReplacementFile(null);
      return;
    }

    const maxBytes = isVideo ? 500 * 1024 * 1024 : 20 * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(isVideo ? "Videos must be 500 MB or smaller." : "PDFs must be 20 MB or smaller.");
      setReplacementFile(null);
      return;
    }

    setReplacementFile(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!courseId) {
      setError("Choose a course.");
      return;
    }

    const payload = new FormData();
    payload.append("title", title.trim());
    payload.append("description", description.trim());
    payload.append("type", type);
    payload.append("intake", intake.trim());
    payload.append("section", section.trim());
    payload.append("course_id", courseId);
    if (replacementFile) {
      payload.append("file", replacementFile);
    }

    setSaving(true);
    setError("");

    try {
      await updateNote(note.id, payload);
      await router.invalidate();
      navigate({
        to: "/pdf/$id",
        params: { id: String(note.id) },
      });
    } catch (submitError: unknown) {
      if (axios.isAxiosError(submitError)) {
        setError(
          submitError.response?.data?.error ??
            submitError.response?.data?.detail ??
            "Could not update this note. Please try again.",
        );
      } else if (submitError instanceof Error) {
        setError(submitError.message);
      } else {
        setError("Could not update this note. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        to="/pdf/$id"
        params={{ id: String(note.id) }}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to note
      </Link>

      <div className="mt-6">
        <p className={labelClass}>Note settings</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Update note</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Change the details below, or replace the uploaded file without losing ratings, comments,
          and view history. Saving resets an approved or rejected note to pending for a new review.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="paper-card mt-8 divide-y divide-border/70">
        <section className="grid gap-5 p-6 sm:p-8">
          <div>
            <h2 className="text-lg font-semibold">Details</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Keep the title and description clear for other students.
            </p>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="title" className={labelClass}>
                Title
              </label>
              <span className="text-xs tabular-nums text-muted-foreground">{title.length}/200</span>
            </div>
            <input
              id="title"
              className={fieldClass}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              required
              disabled={saving}
            />
          </div>

          <div>
            <label htmlFor="type" className={labelClass}>
              Type
            </label>
            <select
              id="type"
              className={fieldClass}
              value={type}
              onChange={(event) => setType(event.target.value as "note" | "suggestion")}
              disabled={saving}
            >
              <option value="note">Note</option>
              <option value="suggestion">Suggestion</option>
            </select>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="description" className={labelClass}>
                Description
              </label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {description.length}/2000
              </span>
            </div>
            <textarea
              id="description"
              className={fieldClass}
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={2000}
              disabled={saving}
            />
          </div>
        </section>

        <section className="grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
          <div className="sm:col-span-2">
            <h2 className="text-lg font-semibold">Class</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Changing the course moves this note to that course queue.
            </p>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="course" className={labelClass}>
              Course
            </label>
            <select
              id="course"
              className={fieldClass}
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              required
              disabled={coursesLoading || Boolean(coursesError) || saving}
            >
              <option value="">{coursesLoading ? "Loading courses..." : "Select a course"}</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} — {course.title}
                </option>
              ))}
            </select>
            {coursesError && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-red-500" role="alert">
                <AlertCircle className="h-3.5 w-3.5" />
                {coursesError}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="intake" className={labelClass}>
              Intake
            </label>
            <input
              id="intake"
              className={fieldClass}
              inputMode="numeric"
              value={intake}
              onChange={(event) => setIntake(event.target.value)}
              required
              disabled={saving}
            />
          </div>

          <div>
            <label htmlFor="section" className={labelClass}>
              Section
            </label>
            <input
              id="section"
              className={fieldClass}
              value={section}
              onChange={(event) => setSection(event.target.value)}
              maxLength={10}
              disabled={saving}
            />
          </div>
        </section>

        <section className="grid gap-5 p-6 sm:p-8">
          <div>
            <h2 className="text-lg font-semibold">Replace file</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Optional. Leave empty to keep the current{" "}
              {note.file_type === "video" ? "video" : "PDF"}.
            </p>
          </div>

          <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-background/60 px-6 py-10 text-center transition-colors hover:border-primary/60 hover:bg-primary/5">
            <input
              type="file"
              className="sr-only"
              accept=".pdf,.mp4,.webm,.mov"
              onChange={(event) => chooseReplacementFile(event.target.files?.[0] ?? null)}
              disabled={saving}
            />
            <UploadCloud className="h-7 w-7 text-primary" />
            <span className="text-sm font-medium">Choose a replacement file</span>
            <span className="text-xs text-muted-foreground">
              PDF up to 20 MB or MP4/WEBM/MOV up to 500 MB
            </span>
          </label>

          {replacementFile && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 p-3 text-sm">
              <FileText className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">{replacementFile.name}</span>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                {(replacementFile.size / 1024 / 1024).toFixed(1)} MB
              </span>
            </div>
          )}
        </section>

        <section className="grid gap-4 p-6 sm:p-8">
          {error && (
            <div
              className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-500"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              to="/pdf/$id"
              params={{ id: String(note.id) }}
              className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || coursesLoading || Boolean(coursesError)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}
