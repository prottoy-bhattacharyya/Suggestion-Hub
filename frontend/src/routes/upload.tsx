import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Circle,
  UploadCloud,
  FileText,
  Clapperboard,
  X,
  LoaderCircle,
  AlertCircle,
  ShieldCheck,
  GraduationCap,
  BookOpenCheck,
} from "lucide-react";
import axios from "axios";

import api from "@/lib/api";
import { getCSRFToken } from "@/lib/utils";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload — Suggestion Hub" },
      {
        name: "description",
        content: "Share a PDF note or a video lesson for teacher review.",
      },
      { property: "og:title", content: "Upload — Suggestion Hub" },
      {
        property: "og:description",
        content: "Submit notes or videos for teacher review.",
      },
    ],
  }),
  component: Upload,
});

type Course = {
  id: number;
  code: string;
  title: string;
  department_id: number;
};

type MediaKind = "pdf" | "video";

const MAX_PDF_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500 MB

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov"];

const TYPES = [
  {
    value: "note",
    label: "Note",
    hint: "Class notes, summaries, worked solutions",
  },
  {
    value: "suggestion",
    label: "Suggestion",
    hint: "Exam suggestions and likely questions",
  },
] as const;

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function Upload() {
  const [mediaKind, setMediaKind] = useState<MediaKind>("pdf");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState("");
  const [type, setType] = useState<string>("note");
  const [intake, setIntake] = useState("");
  const [section, setSection] = useState("");
  const [description, setDescription] = useState("");

  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);

  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState("");

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState(
    "Your upload has been submitted successfully.",
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isVideo = mediaKind === "video";
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_PDF_SIZE;
  const mediaLabel = isVideo ? "video" : "PDF";

  // Load courses from Django.
  useEffect(() => {
    let active = true;

    async function getCoursesList() {
      try {
        setCoursesLoading(true);
        setCoursesError("");

        const csrfToken = await getCSRFToken();

        const response = await api.get("/academics/courses_list/", {
          headers: {
            Accept: "application/json",
            ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
          },
        });

        if (!active) return;

        const courseList = response.data.courses;

        if (!Array.isArray(courseList)) {
          throw new Error("Invalid course list received from server.");
        }

        setCourses(courseList);
      } catch (err: unknown) {
        if (!active) return;

        console.error("Error fetching courses:", err);

        if (axios.isAxiosError(err)) {
          setCoursesError(
            err.response?.data?.error ??
              err.response?.data?.detail ??
              "Failed to load courses. Please refresh the page.",
          );
        } else {
          setCoursesError(err instanceof Error ? err.message : "Failed to load courses.");
        }
      } finally {
        if (active) setCoursesLoading(false);
      }
    }

    void getCoursesList();

    return () => {
      active = false;
    };
  }, []);

  // Switch between the PDF and video sections, clearing any picked file.
  function switchMedia(kind: MediaKind) {
    if (kind === mediaKind || loading) return;
    setMediaKind(kind);
    setFile(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Validate a file coming from the picker or from drag and drop.
  function acceptFile(selectedFile: File | null): boolean {
    setError("");
    setFile(null);

    if (!selectedFile) return false;

    const name = selectedFile.name.toLowerCase();

    if (isVideo) {
      const isVideoFile =
        selectedFile.type.startsWith("video/") ||
        VIDEO_EXTENSIONS.some((ext) => name.endsWith(ext));

      if (!isVideoFile) {
        setError("Only video files are allowed (MP4, WebM, MOV).");
        return false;
      }
    } else {
      const isPdf = selectedFile.type === "application/pdf" || name.endsWith(".pdf");

      if (!isPdf) {
        setError("Only PDF files are allowed.");
        return false;
      }
    }

    if (selectedFile.size === 0) {
      setError("The selected file is empty.");
      return false;
    }

    if (selectedFile.size > maxSize) {
      setError(isVideo ? "Video size must be 500 MB or less." : "File size must be 20 MB or less.");
      return false;
    }

    setFile(selectedFile);
    return true;
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const ok = acceptFile(e.target.files?.[0] ?? null);
    if (!ok) e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    if (loading) return;

    const dropped = e.dataTransfer.files?.[0] ?? null;
    const ok = acceptFile(dropped);

    // Keep the hidden input in sync so "Change" and "Remove" behave.
    if (!ok && fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile() {
    setFile(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Submit the file to Django.
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");

    if (!file) {
      setError(`Please select a ${mediaLabel} file.`);
      return;
    }

    if (!courseId) {
      setError("Please select a course.");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a title.");
      return;
    }

    if (!intake.trim() || !section.trim()) {
      setError("Please enter your intake and section.");
      return;
    }

    try {
      setLoading(true);
      setProgress(0);

      const csrfToken = await getCSRFToken();

      // FormData is required for file uploads.
      const formData = new FormData();

      formData.append("file", file);
      formData.append("media_type", mediaKind); // "pdf" or "video" — Django can branch on this
      formData.append("title", title.trim());
      formData.append("course_id", courseId);
      formData.append("type", type);
      formData.append("intake", intake.trim());
      formData.append("section", section.trim());
      formData.append("description", description.trim());

      const response = await api.post("/notes/upload/", formData, {
        headers: {
          Accept: "application/json",
          ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
        },
        onUploadProgress: (event) => {
          const total = event.total ?? file.size;
          if (total > 0) {
            setProgress(Math.min(100, Math.round((event.loaded / total) * 100)));
          }
        },
      });

      setSuccessMessage(
        response.data?.message ?? `Your ${mediaLabel} has been submitted successfully.`,
      );

      setDone(true);
    } catch (err: unknown) {
      console.error("Upload failed:", err);

      if (axios.isAxiosError(err)) {
        const data = err.response?.data;

        if (data && typeof data === "object") {
          const message = data.error ?? data.detail ?? data.message;

          if (typeof message === "string") {
            setError(message);
          } else {
            // Display Django field validation errors.
            const fieldErrors = Object.entries(data)
              .map(([field, messages]) => {
                const text = Array.isArray(messages) ? messages.join(" ") : String(messages);

                return `${field}: ${text}`;
              })
              .join(" ");

            setError(fieldErrors || `Upload failed (HTTP ${err.response?.status}).`);
          }
        } else if (err.response) {
          setError(`Upload failed (HTTP ${err.response.status}). Please try again.`);
        } else {
          setError(
            "Cannot connect to the server. Check your internet connection and Django server.",
          );
        }
      } else {
        setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  }

  const selectedCourse = courses.find((c) => String(c.id) === courseId);
  const selectedType = TYPES.find((t) => t.value === type) ?? TYPES[0];

  // What the person still has to fill in before they can submit.
  const requirements = [
    { label: `${mediaLabel} selected`, met: Boolean(file) },
    { label: "Title added", met: Boolean(title.trim()) },
    { label: "Course chosen", met: Boolean(courseId) },
    {
      label: "Intake and section added",
      met: Boolean(intake.trim() && section.trim()),
    },
  ];
  const missing = requirements.filter((r) => !r.met);
  const ready = missing.length === 0;

  const reviewSteps = [
    {
      icon: ShieldCheck,
      title: "File check",
      text: isVideo
        ? "We make sure the video plays and isn't a duplicate."
        : "We make sure the PDF opens, isn't encrypted, and isn't a duplicate.",
    },
    {
      icon: GraduationCap,
      title: "Teacher review",
      text: "A teacher for the course checks that the content is accurate.",
    },
    {
      icon: BookOpenCheck,
      title: "Published",
      text: "Students in your course can find and rate it.",
    },
  ];

  // Success screen.
  if (done) {
    const summary = [
      { label: "Kind", value: isVideo ? "Video" : "PDF" },
      { label: "Title", value: title.trim() },
      {
        label: "Course",
        value: selectedCourse ? `${selectedCourse.code} — ${selectedCourse.title}` : "—",
      },
      { label: "Type", value: selectedType.label },
      { label: "Intake and section", value: `${intake.trim()} / ${section.trim()}` },
    ];

    return (
      <div className="mx-auto max-w-lg px-4 py-20">
        <style>{`
          @keyframes upload-pop { 0% { transform: scale(.6); opacity: 0 } 60% { transform: scale(1.08); opacity: 1 } 100% { transform: scale(1) } }
          .upload-pop { animation: upload-pop .5s cubic-bezier(.2,.8,.2,1) both }
          @media (prefers-reduced-motion: reduce) { .upload-pop { animation: none } }
        `}</style>

        <div className="text-center">
          <span className="upload-pop mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/10">
            <CheckCircle2 className="h-9 w-9 text-success" />
          </span>

          <h1 className="mt-6 text-3xl font-semibold tracking-tight">Sent for review</h1>

          <p className="mt-3 text-muted-foreground">{successMessage}</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Other students will see it once a teacher for the course approves it.
          </p>
        </div>

        <dl className="paper-card mt-8 divide-y divide-border">
          {summary.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-6 px-5 py-3 text-sm"
            >
              <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
              <dd className="min-w-0 truncate text-right font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex flex-col gap-3">
          <Link to="/profile/$id" params={{ id: "me" }} className="btn-primary text-center">
            View my uploads
          </Link>

          <button
            type="button"
            onClick={() => {
              setDone(false);
              setFile(null);
              setTitle("");
              setCourseId("");
              setType("note");
              setIntake("");
              setSection("");
              setDescription("");
              setError("");
              setProgress(0);
            }}
            className="btn-ghost"
          >
            Upload another {mediaLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <header className="max-w-xl">
        <h1 className="text-4xl font-semibold tracking-tight">Upload</h1>

        <p className="mt-3 leading-relaxed text-muted-foreground">
          Share your notes or video lessons with your university community. A teacher reviews every
          upload before it goes live.
        </p>
      </header>

      <form
        className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]"
        onSubmit={handleSubmit}
        noValidate
      >
        {/* Main form */}
        <div className="paper-card divide-y divide-border">
          {/* Media kind: PDF or Video */}
          <section className="p-6 sm:p-8">
            <h2 className="text-lg font-semibold">What are you sharing?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a section, then add your file.
            </p>

            <div
              className="mt-5 grid gap-3 sm:grid-cols-2"
              role="radiogroup"
              aria-label="Upload kind"
            >
              {(
                [
                  {
                    value: "pdf" as MediaKind,
                    label: "PDF upload",
                    hint: "Notes, suggestions, slides — up to 20 MB",
                    Icon: FileText,
                  },
                  {
                    value: "video" as MediaKind,
                    label: "Video upload",
                    hint: "Recorded lessons, walkthroughs — up to 500 MB",
                    Icon: Clapperboard,
                  },
                ] as const
              ).map(({ value, label, hint, Icon }) => {
                const active = mediaKind === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={loading}
                    onClick={() => switchMedia(value)}
                    className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                      active ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/60"
                    }`}
                  >
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
                        active ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        {label}
                        {active && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                        {hint}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* File */}
          <section className="p-6 sm:p-8">
            <h2 className="text-lg font-semibold">Your file</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isVideo ? "MP4, WebM or MOV, up to 500 MB." : "PDF only, up to 20 MB."}
            </p>

            {!file ? (
              <label
                htmlFor="media-file"
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!loading) setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`mt-5 grid cursor-pointer place-items-center gap-3 rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors focus-within:ring-2 focus-within:ring-primary/40 ${
                  dragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-secondary/60"
                }`}
              >
                <span
                  className={`grid h-14 w-14 place-items-center rounded-full transition-colors ${
                    dragging ? "bg-primary text-white" : "bg-primary/10 text-primary"
                  }`}
                >
                  <UploadCloud className="h-7 w-7" />
                </span>

                <span className="text-base font-medium">
                  {dragging ? `Drop to add your ${mediaLabel}` : `Drag a ${mediaLabel} here`}
                </span>

                <span className="text-sm text-muted-foreground">
                  or{" "}
                  <span className="font-medium text-primary underline underline-offset-4">
                    browse your files
                  </span>
                </span>
              </label>
            ) : (
              <div className="mt-5 rounded-xl border border-border bg-secondary/40 p-4">
                <div className="flex items-center gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    {isVideo ? (
                      <Clapperboard className="h-6 w-6" />
                    ) : (
                      <FileText className="h-6 w-6" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatSize(file.size)} · {isVideo ? "Video" : "PDF"}
                    </p>
                  </div>

                  {!loading && (
                    <>
                      <label
                        htmlFor="media-file"
                        className="cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 focus-within:ring-2 focus-within:ring-primary/40"
                      >
                        Change
                      </label>

                      <button
                        type="button"
                        onClick={removeFile}
                        className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        aria-label="Remove selected file"
                      >
                        <X size={18} />
                      </button>
                    </>
                  )}
                </div>

                {loading && (
                  <div className="mt-4" aria-live="polite">
                    <div
                      className="h-1.5 overflow-hidden rounded-full bg-border"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={progress}
                    >
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground">
                      {progress < 100
                        ? `Uploading… ${progress}%`
                        : "Upload complete. Checking your file…"}
                    </p>
                  </div>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              id="media-file"
              type="file"
              accept={isVideo ? "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" : ".pdf,application/pdf"}
              className="sr-only"
              onChange={handleFileChange}
              disabled={loading}
            />
          </section>

          {/* Details */}
          <section className="grid gap-5 p-6 sm:p-8">
            <div>
              <h2 className="text-lg font-semibold">Details</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A clear title helps other students find your upload.
              </p>
            </div>

            <div>
              <div className="flex items-baseline justify-between">
                <label htmlFor="title" className="label-sm">
                  Title
                </label>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {title.length}/200
                </span>
              </div>

              <input
                id="title"
                name="title"
                className="field w-full"
                placeholder={
                  isVideo
                    ? "e.g. Data Structures - Chapter 1 Walkthrough"
                    : "e.g. Data Structures - Chapter 1 Notes"
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
                disabled={loading}
              />
            </div>

            <fieldset disabled={loading}>
              <legend className="label-sm">Type</legend>

              <div className="mt-1.5 grid gap-3 sm:grid-cols-2">
                {TYPES.map((t) => (
                  <label key={t.value} className="relative block cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value={t.value}
                      checked={type === t.value}
                      onChange={() => setType(t.value)}
                      className="peer sr-only"
                    />

                    <span className="block rounded-xl border border-border p-4 transition-colors hover:bg-secondary/60 peer-checked:border-primary peer-checked:bg-primary/5 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40">
                      <span className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t.label}</span>
                        {type === t.value ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        ) : (
                          <Circle className="h-4 w-4 text-border" />
                        )}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                        {t.hint}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <div className="flex items-baseline justify-between">
                <label htmlFor="description" className="label-sm">
                  Description <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {description.length}/2000
                </span>
              </div>

              <textarea
                id="description"
                name="description"
                className="field w-full"
                rows={4}
                placeholder={
                  isVideo
                    ? "What does this video cover? Mention chapters, topics, or the exam it's for."
                    : "What does this PDF cover? Mention chapters, topics, or the exam it's for."
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                disabled={loading}
              />
            </div>
          </section>

          {/* Class */}
          <section className="grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
            <div className="sm:col-span-2">
              <h2 className="text-lg font-semibold">Your class</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Used to show your upload to the right students and teachers.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="course" className="label-sm">
                Course
              </label>

              <select
                id="course"
                name="course_id"
                className="field w-full"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                required
                disabled={coursesLoading || coursesError !== "" || loading}
              >
                <option value="">
                  {coursesLoading ? "Loading courses..." : "Select a course"}
                </option>

                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} — {course.title}
                  </option>
                ))}
              </select>

              {coursesError && (
                <p className="mt-2 text-xs text-red-500" role="alert">
                  {coursesError}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="intake" className="label-sm">
                Intake
              </label>

              <input
                id="intake"
                name="intake"
                type="text"
                inputMode="numeric"
                className="field w-full"
                placeholder="e.g. 49"
                value={intake}
                onChange={(e) => setIntake(e.target.value)}
                required
                disabled={loading}
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
                placeholder="e.g. 3"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </section>

          {/* Actions */}
          <section className="grid gap-4 p-6 sm:p-8">
            {error && (
              <div
                className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-500"
                role="alert"
              >
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || coursesLoading || courses.length === 0 || !ready}
              className="btn-primary inline-flex w-full items-center justify-center gap-2 py-3 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <LoaderCircle size={18} className="animate-spin motion-reduce:animate-none" />
                  {progress < 100 ? "Uploading…" : "Checking file…"}
                </>
              ) : (
                <>
                  <UploadCloud size={18} />
                  Submit for review
                </>
              )}
            </button>

            <p className="text-center text-xs text-muted-foreground" aria-live="polite">
              {ready || loading
                ? `Your ${mediaLabel} stays private until a course teacher approves it.`
                : `Still needed: ${missing.map((m) => m.label.toLowerCase()).join(", ")}.`}
            </p>
          </section>
        </div>

        {/* Side panel */}
        <aside className="grid gap-6 lg:sticky lg:top-24">
          <div className="paper-card p-5">
            <h3 className="text-base font-semibold">Ready to submit</h3>

            <ul className="mt-4 space-y-3 text-sm">
              {requirements.map((r) => (
                <li key={r.label} className="flex items-center gap-2.5">
                  {r.met ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-border" />
                  )}

                  <span className={r.met ? "text-foreground" : "text-muted-foreground"}>
                    {r.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="paper-card p-5">
            <h3 className="text-base font-semibold">What happens next</h3>

            <ol className="mt-4">
              {reviewSteps.map((step, i) => {
                const Icon = step.icon;
                const last = i === reviewSteps.length - 1;

                return (
                  <li key={step.title} className="relative flex gap-3 pb-5 last:pb-0">
                    {!last && (
                      <span
                        className="absolute left-4 top-9 -ml-px h-[calc(100%-2rem)] w-px bg-border"
                        aria-hidden="true"
                      />
                    )}

                    <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>

                    <div className="min-w-0">
                      <p className="text-sm font-medium">{step.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {step.text}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>
      </form>
    </div>
  );
}
