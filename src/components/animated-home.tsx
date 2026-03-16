"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { PlusBurstNav } from "@/components/plus-burst-nav";

const reveal = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const constraintCards = [
  {
    index: "01",
    title: "Automated authenticity",
    description:
      "Every upload runs through signature, MIME, size, duplicate, and filename-risk checks before it can count toward completion.",
  },
  {
    index: "02",
    title: "Missing-file triggers",
    description:
      "The application state continuously evaluates required documents and surfaces alerts as soon as mandatory files are absent or rejected.",
  },
  {
    index: "03",
    title: "Real-time progress",
    description:
      "Students and reviewers see the live completion percentage, verification queue, and status feed without relying on manual folder reviews.",
  },
];

const workflow = [
  {
    step: "01",
    title: "Structured intake",
    detail: "Students declare the document type up front so the system can enforce route-specific rules.",
  },
  {
    step: "02",
    title: "Verification engine",
    detail: "The backend scores each file and decides whether it is verified, still processing, or rejected.",
  },
  {
    step: "03",
    title: "Triggered alerts",
    detail: "Missing required files remain visible until the application packet is complete.",
  },
  {
    step: "04",
    title: "Review-ready packet",
    detail: "Once all mandatory documents verify, the portal signals that the case is ready for human review.",
  },
];

export function AnimatedHome() {
  return (
    <main className="bg-[var(--background)] text-[var(--foreground)]">
      <section className="relative overflow-hidden border-b border-black/10 bg-[radial-gradient(circle_at_top_left,_rgba(232,109,31,0.18),_transparent_26%),linear-gradient(180deg,rgba(255,250,243,0.98)_0%,rgba(244,239,231,0.92)_100%)]">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(20,16,13,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(20,16,13,0.06)_1px,transparent_1px)] bg-[size:52px_52px]" />
        </div>
        <div className="pointer-events-none absolute right-[-10rem] top-[-4rem] h-[28rem] w-[28rem] rounded-full bg-[rgba(232,109,31,0.16)] blur-3xl" />

        <div className="relative mx-auto min-h-screen w-full max-w-[1600px] px-5 pb-14 pt-5 sm:px-8 sm:pb-18">
          <div className="flex items-center justify-between border-b border-black/12 px-1 pb-2 sm:px-2">
            <Link href="/" aria-label="Endurance Home" className="inline-flex items-center">
              <Image
                src="/logo.svg"
                alt="Endurance logo"
                width={240}
                height={72}
                className="h-[clamp(1.9rem,3.6vw,3.3rem)] w-auto"
                priority
              />
            </Link>
            <PlusBurstNav buttonClassName="h-[40px] w-[40px] sm:h-[46px] sm:w-[46px]" />
          </div>

          <div className="grid min-h-[calc(100vh-96px)] items-center gap-12 py-12 lg:grid-cols-[1.08fr_0.92fr]">
            <motion.div
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="font-mono text-[12px] uppercase tracking-[0.3em] text-[var(--muted)]">
                Student Application & Document Verification System
              </p>
              <h1 className="mt-5 max-w-5xl text-[clamp(3.3rem,8vw,7.4rem)] font-semibold leading-[0.88] tracking-[-0.06em]">
                Build the portal a simple cloud drive cannot fake.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--foreground-soft)] sm:text-xl">
                Endurance now frames your site around the actual brief: a secure student upload
                hub with automated authenticity checks, missing-file triggers, and real-time
                application progress.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/portal"
                  className="inline-flex items-center gap-3 border border-[var(--foreground)] bg-[var(--foreground)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--background)] transition hover:opacity-92"
                >
                  Open Live Portal
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-3 border border-black/10 bg-white/72 px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--foreground)] transition hover:bg-white"
                >
                  Contact Team
                </Link>
              </div>

              <div className="mt-10 grid gap-4 text-sm leading-6 text-[var(--foreground-soft)] sm:grid-cols-3">
                <div className="border border-black/10 bg-white/72 p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
                    Constraint
                  </p>
                  <p className="mt-2">Must execute automated authenticity verification.</p>
                </div>
                <div className="border border-black/10 bg-white/72 p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
                    Trigger
                  </p>
                  <p className="mt-2">Must notify users about missing required documents.</p>
                </div>
                <div className="border border-black/10 bg-white/72 p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
                    Outcome
                  </p>
                  <p className="mt-2">Students track progress without relying on manual follow-up.</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
              className="relative"
            >
              <div className="absolute -left-4 top-12 hidden h-24 w-24 border border-black/10 bg-white/40 lg:block" />
              <div className="absolute -right-4 bottom-12 hidden h-18 w-18 border border-[var(--accent)]/30 bg-[rgba(232,109,31,0.12)] lg:block" />
              <div className="relative overflow-hidden border border-black/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.92),rgba(247,240,230,0.88))] p-5 shadow-[0_40px_90px_rgba(20,16,13,0.12)]">
                <div className="grid gap-4 border border-black/8 bg-[var(--panel)] p-4 sm:grid-cols-[0.95fr_1.05fr]">
                  <div className="space-y-4">
                    <div className="border border-black/10 bg-white px-4 py-3">
                      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
                        Document Type
                      </p>
                      <p className="mt-2 text-lg font-semibold">Passport</p>
                    </div>
                    <div className="border border-black/10 bg-white px-4 py-3">
                      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
                        Authenticity Queue
                      </p>
                      <p className="mt-2 text-lg font-semibold">Signature / MIME / Hash</p>
                    </div>
                    <div className="border border-black/10 bg-white px-4 py-3">
                      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
                        Progress
                      </p>
                      <div className="mt-3 h-2 w-full overflow-hidden bg-black/8">
                        <div className="h-full w-[66%] bg-[linear-gradient(90deg,var(--accent)_0%,#ffb06d_100%)]" />
                      </div>
                    </div>
                  </div>

                  <div className="border border-black/10 bg-white p-4">
                    <div className="flex items-start justify-between gap-4 border-b border-black/10 pb-3">
                      <div>
                        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
                          Application Feed
                        </p>
                        <p className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Live logic state</p>
                      </div>
                      <div className="border border-[var(--accent)]/25 bg-[rgba(232,109,31,0.12)] px-2 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">
                        Active
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3">
                      <div className="border border-[#24704e]/18 bg-[#edf8f1] px-4 py-3 text-sm text-[#1b553b]">
                        Passport verified and counted toward completion.
                      </div>
                      <div className="border border-[#d9862d]/18 bg-[#fff6ea] px-4 py-3 text-sm text-[#985a14]">
                        Academic transcript still missing from the packet.
                      </div>
                      <div className="border border-black/10 bg-[var(--panel)] px-4 py-3 text-sm text-[var(--foreground-soft)]">
                        Real-time application readiness updates after each upload.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="px-5 py-18 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-[1500px]">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={reveal}
            className="max-w-4xl"
          >
            <p className="font-mono text-[12px] uppercase tracking-[0.3em] text-[var(--muted)]">
              Constraint Coverage
            </p>
            <h2 className="mt-4 text-[clamp(2.4rem,5vw,4.7rem)] font-semibold leading-[0.95] tracking-[-0.05em]">
              The website now explains why the solution passes evaluation.
            </h2>
          </motion.div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {constraintCards.map((card, index) => (
              <motion.article
                key={card.index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1], delay: index * 0.08 }}
                className="border border-black/10 bg-white/82 p-6 shadow-[0_18px_44px_rgba(20,16,13,0.08)]"
              >
                <p className="font-mono text-[12px] uppercase tracking-[0.26em] text-[var(--muted)]">
                  {card.index}
                </p>
                <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">{card.title}</h3>
                <p className="mt-4 text-base leading-7 text-[var(--foreground-soft)]">
                  {card.description}
                </p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-black/10 bg-[linear-gradient(180deg,rgba(255,250,243,0.92)_0%,rgba(246,239,230,0.85)_100%)] px-5 py-18 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-[1500px]">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={reveal}
            className="flex flex-wrap items-end justify-between gap-6"
          >
            <div className="max-w-3xl">
              <p className="font-mono text-[12px] uppercase tracking-[0.3em] text-[var(--muted)]">
                Workflow
              </p>
              <h2 className="mt-4 text-[clamp(2.4rem,5vw,4.7rem)] font-semibold leading-[0.95] tracking-[-0.05em]">
                Four steps from upload to review-ready.
              </h2>
            </div>
            <Link
              href="/portal"
              className="inline-flex items-center gap-3 border border-black/10 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--foreground)] transition hover:bg-[var(--panel)]"
            >
              Test the workflow
            </Link>
          </motion.div>

          <div className="mt-10 grid gap-4 lg:grid-cols-4">
            {workflow.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1], delay: index * 0.07 }}
                className="border border-black/10 bg-white/80 p-5"
              >
                <p className="font-mono text-[12px] uppercase tracking-[0.24em] text-[var(--accent)]">
                  {item.step}
                </p>
                <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">{item.title}</h3>
                <p className="mt-4 text-base leading-7 text-[var(--foreground-soft)]">{item.detail}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <footer className="px-5 py-18 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-[1500px] border border-black/10 bg-white/82 p-8 shadow-[0_22px_50px_rgba(20,16,13,0.08)] sm:p-10">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div className="max-w-3xl">
              <p className="font-mono text-[12px] uppercase tracking-[0.28em] text-[var(--muted)]">
                Launch State
              </p>
              <h2 className="mt-4 text-[clamp(2.4rem,5vw,4.5rem)] font-semibold leading-[0.95] tracking-[-0.05em]">
                Open the portal and run the verification flow end to end.
              </h2>
            </div>
            <Link
              href="/portal"
              className="group inline-flex items-center gap-4 border border-[var(--foreground)] bg-[var(--foreground)] px-6 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--background)]"
            >
              Start Uploading
              <span className="transition-transform duration-300 group-hover:translate-x-1">/</span>
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
