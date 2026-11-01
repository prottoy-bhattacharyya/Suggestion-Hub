import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  UploadCloud,
  FileText,
  X,
  LoaderCircle,
  AlertCircle,
} from "lucide-react";
import axios from "axios";

import api from "@/lib/api";
import { getCSRFToken } from "@/lib/utils";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload a PDF — Suggestion Hub" },
      {
        name: "description",
        content: "Share a note or exam suggestion for teacher review.",
      },
      { property: "og:title", content: "Upload a PDF — Suggestion Hub" },
      {
        property: "og:description",
        content: "Submit notes for teacher review.",
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

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState("");
  const [type, setType] = useState("note");
  const [intake, setIntake] = useState("");
  const [section, setSection] = useState("");
  const [description, setDescription] = useState("");

  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState("");

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState(
    "Your PDF has been submitted successfully.",
  );

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
      } 
      catch (err: unknown) {
        if (!active) return;

        console.error("Error fetching courses:", err);

        if (axios.isAxiosError(err)) {
          setCoursesError(
            err.response?.data?.error ??
              err.response?.data?.detail ??
              "Failed to load courses. Please refresh the page.",
          );
        } else {
          setCoursesError(
            err instanceof Error
              ? err.message
              : "Failed to load courses.",
          );
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

  // Validate the selected PDF.
  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFile = e.target.files?.[0] ?? null;

    setError("");
    setFile(null);

    if (!selectedFile) return;

    const isPdf =
      selectedFile.type === "application/pdf" ||
      selectedFile.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setError("Only PDF files are allowed.");
      e.target.value = "";
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("File size must be 20 MB or less.");
      e.target.value = "";
      return;
    }

    if (selectedFile.size === 0) {
      setError("The selected file is empty.");
      e.target.value = "";
      return;
    }

    setFile(selectedFile);
  }

  function removeFile() {
    setFile(null);

    const input = document.getElementById(
      "pdf-file",
    ) as HTMLInputElement | null;

    if (input) input.value = "";
  }

  // Submit the PDF to Django.
  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    setError("");

    if (!file) {
      setError("Please select a PDF file.");
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

      const csrfToken = await getCSRFToken();

      // FormData is required for file uploads.
      const formData = new FormData();

      formData.append("file", file);
      formData.append("title", title.trim());
      formData.append("course_id", courseId);
      formData.append("type", type);
      formData.append("intake", intake.trim());
      formData.append("section", section.trim());
      formData.append("description", description.trim());

      const response = await api.post(
        "/notes/upload/",
        formData,
        {
          headers: {
            Accept: "application/json",
            ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
          },
        },
      );

      setSuccessMessage(
        response.data?.message ??
          "Your PDF has been submitted successfully.",
      );

      setDone(true);
    } catch (err: unknown) {
      console.error("PDF upload failed:", err);

      if (axios.isAxiosError(err)) {
        const data = err.response?.data;

        if (data && typeof data === "object") {
          const message =
            data.error ??
            data.detail ??
            data.message;

          if (typeof message === "string") {
            setError(message);
          } else {
            // Display Django field validation errors.
            const fieldErrors = Object.entries(data)
              .map(([field, messages]) => {
                const text = Array.isArray(messages)
                  ? messages.join(" ")
                  : String(messages);

                return `${field}: ${text}`;
              })
              .join(" ");

            setError(
              fieldErrors ||
                `Upload failed (HTTP ${err.response?.status}).`,
            );
          }
        } else if (err.response) {
          setError(
            `Upload failed (HTTP ${err.response.status}). Please try again.`,
          );
        } else {
          setError(
            "Cannot connect to the server. Check your internet connection and Django server.",
          );
        }
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "An unexpected error occurred.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  // Success screen.
  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-success" />

        <h1 className="mt-4 text-3xl font-semibold">
          Sent for review
        </h1>

        <p className="mt-3 text-muted-foreground">
          {successMessage}
        </p>

        <p className="mt-2 text-sm text-muted-foreground">
          Your submission is pending review. Other users can see it
          after a course teacher approves it.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            to="/profile/me/"
            className="btn-primary text-center"
          >
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
            }}
            className="btn-ghost"
          >
            Upload another PDF
          </button>
        </div>
      </div>
    );
  }

  const checks = [
    "PDF file selected",
    "File size is under 20 MB",
    "File format is PDF",
    "Server checks for corrupted or encrypted files",
    "Server checks page count and duplicates",
  ];

  const fileValid = Boolean(file);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold">Upload a PDF</h1>

      <p className="mt-2 text-sm text-muted-foreground">
        Share your notes or exam suggestions with your university
        community.
      </p>

      <form
        className="mt-6 grid gap-6 md:grid-cols-[1fr_260px]"
        onSubmit={handleSubmit}
      >
        {/* Main form */}
        <div className="paper-card grid gap-4 p-6 sm:grid-cols-2">

          {/* PDF selection */}
          <div className="sm:col-span-2">
            <label
              htmlFor="pdf-file"
              className="grid cursor-pointer place-items-center gap-3 rounded-md border-2 border-dashed border-border p-8 text-center transition-colors hover:bg-secondary"
            >
              <UploadCloud className="h-9 w-9 text-primary" />

              <span className="text-sm font-medium">
                {file ? "Change PDF file" : "Choose a PDF file"}
              </span>

              <span className="text-xs text-muted-foreground">
                PDF only · Maximum 20 MB
              </span>
            </label>

            <input
              id="pdf-file"
              type="file"
              accept=".pdf,application/pdf"
              className="sr-only"
              onChange={handleFileChange}
              disabled={loading}
            />

            {file && (
              <div className="mt-3 flex items-center gap-3 rounded-md border border-border p-3">
                <FileText className="h-7 w-7 shrink-0 text-primary" />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {file.name}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>

                <button
                  type="button"
                  onClick={removeFile}
                  disabled={loading}
                  className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  aria-label="Remove selected file"
                >
                  <X size={18} />
                </button>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="sm:col-span-2">
            <label htmlFor="title" className="label-sm">
              Title
            </label>

            <input
              id="title"
              name="title"
              className="field w-full"
              placeholder="e.g. Data Structures - Chapter 1 Notes"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
              disabled={loading}
            />
          </div>

          {/* Course */}
          <div>
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
                {coursesLoading
                  ? "Loading courses..."
                  : "Select a course"}
              </option>

              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} — {course.title}
                </option>
              ))}
            </select>

            {coursesError && (
              <p className="mt-2 text-xs text-red-500">
                {coursesError}
              </p>
            )}
          </div>

          {/* Type */}
          <div>
            <label htmlFor="type" className="label-sm">
              Type
            </label>

            <select
              id="type"
              name="type"
              className="field w-full"
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={loading}
            >
              <option value="note">Note</option>
              <option value="suggestion">Suggestion</option>
            </select>
          </div>

          {/* Intake */}
          <div>
            <label htmlFor="intake" className="label-sm">
              Intake
            </label>

            <input
              id="intake"
              name="intake"
              type="text"
              className="field w-full"
              placeholder="e.g. 49"
              value={intake}
              onChange={(e) => setIntake(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Section */}
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

          {/* Description */}
          <div className="sm:col-span-2">
            <label htmlFor="description" className="label-sm">
              Description (optional)
            </label>

            <textarea
              id="description"
              name="description"
              className="field w-full"
              rows={4}
              placeholder="Add a short description about your PDF..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              disabled={loading}
            />
          </div>

          {/* Error message */}
          {error && (
            <div
              className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-500 sm:col-span-2"
              role="alert"
            >
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={
              loading ||
              coursesLoading ||
              courses.length === 0 ||
              !file
            }
            className="btn-primary inline-flex items-center justify-center gap-2 sm:col-span-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <LoaderCircle size={18} className="animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <UploadCloud size={18} />
                Submit for review
              </>
            )}
          </button>
        </div>

        {/* Automatic checks */}
        <aside className="paper-card h-fit p-5">
          <h3 className="text-base font-semibold">
            Automatic checks
          </h3>

          <ul className="mt-4 space-y-3 text-sm">
            {checks.map((check, index) => {
              const completed =
                index === 0
                  ? fileValid
                  : index === 1
                    ? fileValid && file!.size <= MAX_FILE_SIZE
                    : index === 2
                      ? fileValid
                      : false;

              return (
                <li key={check} className="flex gap-2">
                  <CheckCircle2
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      completed
                        ? "text-success"
                        : "text-muted-foreground"
                    }`}
                  />

                  <span className="text-muted-foreground">
                    {check}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="mt-5 border-t border-border pt-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Your PDF will remain pending until a course teacher
              reviews and approves it.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}