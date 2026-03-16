import Link from "next/link";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-5 pb-16 pt-32 text-[var(--foreground)] sm:px-8">
      <div className="mx-auto max-w-5xl border border-black/10 bg-white/82 p-8 shadow-[0_22px_50px_rgba(20,16,13,0.08)] sm:p-12">
        <p className="font-mono text-[12px] uppercase tracking-[0.28em] text-[var(--muted)]">
          Contact
        </p>
        <h1 className="mt-4 text-[clamp(2.8rem,6vw,5rem)] font-semibold leading-[0.92] tracking-[-0.05em]">
          Operationalize the student verification workflow.
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--foreground-soft)]">
          This build is structured as an MVP for the PDF brief. The next production step is
          replacing the in-memory store with persistent storage and stronger OCR or forgery
          detection services.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="border border-black/10 bg-[var(--panel)] p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
              Recommended next step
            </p>
            <p className="mt-3 text-base leading-7 text-[var(--foreground-soft)]">
              Add durable storage for application state and uploaded files, then integrate OCR or
              document-analysis APIs for stronger authenticity verification.
            </p>
          </div>
          <div className="border border-black/10 bg-[var(--panel)] p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
              Live demo
            </p>
            <p className="mt-3 text-base leading-7 text-[var(--foreground-soft)]">
              The current portal already demonstrates uploads, automated rule checks, rejection
              logic, and real-time progress updates.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/portal"
            className="inline-flex items-center gap-3 border border-[var(--foreground)] bg-[var(--foreground)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--background)]"
          >
            Open Portal
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-3 border border-black/10 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--foreground)]"
          >
            Return Home
          </Link>
        </div>
      </div>
    </main>
  );
}
