import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Search,
  Sparkles,
  Users,
  Upload,
  Download,
  Star,
  Flag,
  BookOpen,
  GraduationCap,
  FileCheck2,
  ArrowRight,
  Mail,
  Github,
  Facebook,
  Instagram,
  Linkedin,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Suggestion Hub — Notes & Exam Suggestions You Can Trust" },
      {
        name: "description",
        content:
          "Find university class notes and exam suggestions reviewed by teachers. Upload, download, rate, and share educational PDFs with your classmates.",
      },
      {
        property: "og:title",
        content: "Suggestion Hub — Notes & Exam Suggestions You Can Trust",
      },
      {
        property: "og:description",
        content:
          "A place for university students to share teacher-reviewed notes and exam suggestions.",
      },
    ],
  }),
  component: Index,
});

const features = [
  {
    icon: ShieldCheck,
    title: "Teacher-reviewed content",
    description:
      "Uploaded notes and suggestions go through teacher review before being approved. Find learning materials with an additional layer of academic verification.",
  },
  {
    icon: Search,
    title: "Find notes by course",
    description:
      "Discover class notes, study materials, and exam suggestions organized around your courses, intake, and section.",
  },
  {
    icon: Upload,
    title: "Share your knowledge",
    description:
      "Upload your own PDFs and make useful study materials available to students who need them.",
  },
  {
    icon: Users,
    title: "Build your community",
    description:
      "Share helpful resources, gain followers, and connect with classmates and other students.",
  },
  {
    icon: Star,
    title: "Rate useful resources",
    description:
      "Give ratings to uploaded PDFs and help other students discover valuable study materials.",
  },
  {
    icon: Flag,
    title: "Help maintain quality",
    description:
      "Found an incorrect, irrelevant, or inappropriate PDF? Report it so it can be reviewed.",
  },
];

const steps = [
  {
    number: "01",
    title: "Find what you need",
    description:
      "Browse notes and exam suggestions by course and find materials for your classes.",
    icon: Search,
  },
  {
    number: "02",
    title: "Learn and contribute",
    description:
      "Download useful PDFs or upload your own materials to help other students.",
    icon: BookOpen,
  },
  {
    number: "03",
    title: "Grow together",
    description:
      "Rate resources, report problematic content, follow contributors, and build your academic community.",
    icon: Users,
  },
];

function Index() {
  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative">
        <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-highlight/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 py-24 md:grid-cols-2 md:py-32">
          <div>
            <span className="chip bg-highlight/25">
              <GraduationCap className="mr-1 inline h-4 w-4" />
              Built for university students
            </span>

            <h1 className="mt-6 text-5xl font-semibold leading-[1.08] tracking-tight md:text-6xl">
              Your classes.
              <br />
              Your notes.
              <br />
              <em className="text-primary">Your success.</em>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">
              Get class notes, study materials, and exam suggestions for your
              university courses — all in one place. Learn from
              teacher-reviewed resources and share your knowledge with other
              students.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/signup"
                className="btn-primary inline-flex items-center gap-2"
              >
                Get started
                <ArrowRight size={18} />
              </Link>

              <Link to="/login" className="btn-ghost">
                Log in
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Teacher-reviewed PDFs
              </span>
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Notes and suggestions
              </span>
            </div>
          </div>

          {/* Feature illustration made with UI elements, not PDF data */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-5 rounded-[2rem] bg-primary/10 blur-2xl" />

            <div className="relative rounded-3xl border border-border bg-card p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Your academic space
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">
                    Learn together.
                  </h2>
                </div>
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <GraduationCap size={28} />
                </div>
              </div>

              <div className="mt-7 space-y-3">
                <div className="flex items-center gap-4 rounded-xl border border-border bg-background p-4">
                  <div className="rounded-xl bg-primary/10 p-3 text-primary">
                    <FileCheck2 size={23} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">Teacher-reviewed notes</p>
                    <p className="text-xs text-muted-foreground">
                      Reviewed before approval
                    </p>
                  </div>
                  <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
                </div>

                <div className="flex items-center gap-4 rounded-xl border border-border bg-background p-4">
                  <div className="rounded-xl bg-highlight/20 p-3 text-highlight">
                    <BookOpen size={23} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">Exam suggestions</p>
                    <p className="text-xs text-muted-foreground">
                      Prepare for your exams
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                </div>

                <div className="flex items-center gap-4 rounded-xl border border-border bg-background p-4">
                  <div className="rounded-xl bg-secondary p-3 text-foreground">
                    <Users size={23} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">Student community</p>
                    <p className="text-xs text-muted-foreground">
                      Share, follow, and grow
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                </div>
              </div>

              <div className="mt-5 rounded-xl bg-primary/5 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Better learning starts with sharing
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Every useful upload can help another student understand
                  something new.
                </p>
              </div>
            </div>

            <div className="absolute -bottom-6 -left-8 hidden items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-lg sm:flex">
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <Upload size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold">Share knowledge</p>
                <p className="text-xs text-muted-foreground">
                  Help your classmates
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="chip bg-highlight/25">Why Suggestion Hub?</span>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
              Everything you need for smarter studying
            </h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              More than just a place to download PDFs. It's a community where
              students share resources, support each other, and learn together.
            </p>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-border bg-background p-6 transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="inline-flex rounded-xl bg-primary/10 p-3 text-primary">
                    <Icon size={24} />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="chip bg-highlight/25">Simple and useful</span>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-muted-foreground">
            Start finding resources and contributing to your student community
            in just a few steps.
          </p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <div key={step.number} className="relative">
                <div className="flex items-center justify-between">
                  <span className="text-4xl font-bold text-primary/25">
                    {step.number}
                  </span>
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                    <Icon size={25} />
                  </div>
                </div>
                <h3 className="mt-5 text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Trust section */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 md:grid-cols-2">
          <div>
            <div className="inline-flex rounded-xl bg-primary/10 p-3 text-primary">
              <ShieldCheck size={28} />
            </div>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight md:text-4xl">
              Study with more confidence.
            </h2>
            <p className="mt-5 leading-7 text-muted-foreground">
              We believe students deserve access to useful and trustworthy
              study resources. That's why uploaded PDFs are reviewed by
              teachers before approval.
            </p>
            <p className="mt-4 leading-7 text-muted-foreground">
              Teacher review adds an important layer of quality control, so
              students can make more informed choices about the materials they
              use. You can also rate resources and report content that needs
              another look.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex gap-4 rounded-2xl border border-border bg-background p-5">
              <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-primary" />
              <div>
                <h3 className="font-semibold">Reviewed by teachers</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Notes are checked through a teacher review process before
                  they are approved for students.
                </p>
              </div>
            </div>

            <div className="flex gap-4 rounded-2xl border border-border bg-background p-5">
              <Star className="mt-1 h-6 w-6 shrink-0 text-primary" />
              <div>
                <h3 className="font-semibold">Community ratings</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Student ratings help highlight useful materials and guide
                  other learners.
                </p>
              </div>
            </div>

            <div className="flex gap-4 rounded-2xl border border-border bg-background p-5">
              <Flag className="mt-1 h-6 w-6 shrink-0 text-primary" />
              <div>
                <h3 className="font-semibold">Community reporting</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Users can report PDFs that may need further review.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground md:px-14">
          <div className="pointer-events-none absolute -right-20 -top-32 h-72 w-72 rounded-full border-[40px] border-white/10" />
          <div className="pointer-events-none absolute -bottom-40 -left-20 h-72 w-72 rounded-full border-[40px] border-white/10" />

          <div className="relative">
            <GraduationCap className="mx-auto h-10 w-10" />
            <h2 className="mt-5 text-3xl font-semibold tracking-tight md:text-4xl">
              Your next study resource is waiting.
            </h2>
            <p className="mx-auto mt-4 max-w-xl leading-7 text-primary-foreground/80">
              Join Suggestion Hub, discover useful notes and exam suggestions,
              and help other students by sharing what you know.
            </p>
            <Link
              to="/signup"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-background px-6 py-3 font-semibold text-foreground transition-opacity hover:opacity-90"
            >
              Create your free account
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-10 md:grid-cols-3">
            <div>
              <Link to="/" className="font-display text-2xl font-semibold">
                Suggestion Hub
                <span className="text-highlight">.</span>
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">
                A student-powered learning community for sharing
                teacher-reviewed notes, exam suggestions, and knowledge.
              </p>
            </div>

            <div>
              <h3 className="font-semibold">Quick links</h3>
              <div className="mt-4 flex flex-col items-start gap-3 text-sm text-muted-foreground">
                <Link to="/feeds" className="hover:text-foreground">
                  Explore notes
                </Link>
                <Link to="/search" className="hover:text-foreground">
                  Search resources
                </Link>
                <Link to="/upload" className="hover:text-foreground">
                  Upload a PDF
                </Link>
                <Link to="/signup" className="hover:text-foreground">
                  Create account
                </Link>
              </div>
            </div>

            <div>
              <h3 className="font-semibold">Contact & social</h3>
              <a
                href="mailto:prottoyvhattacharyya@gmail.com"
                className="mt-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <Mail size={16} />
                prottoyvhattacharyya@gmail.com
              </a>

              {/* Replace these placeholder URLs with your real profiles */}
              <div className="mt-5 flex items-center gap-3">
                <a
                  href="https://github.com/your-username"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="GitHub"
                  title="GitHub"
                  className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <Github size={19} />
                </a>
                <a
                  href="https://facebook.com/your-profile"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  title="Facebook"
                  className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <Facebook size={19} />
                </a>
                <a
                  href="https://instagram.com/your-profile"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  title="Instagram"
                  className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <Instagram size={19} />
                </a>
                <a
                  href="https://linkedin.com/in/your-profile"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="LinkedIn"
                  title="LinkedIn"
                  className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <Linkedin size={19} />
                </a>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} Suggestion Hub. All rights
              reserved.
            </p>
            <p>
              Created by{" "}
              <span className="font-medium text-foreground">
                Prottoy Bhattacharyya
              </span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}