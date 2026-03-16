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

const requiredDocuments = [
  "Passport",
  "Academic Transcript",
  "Bank Statement",
  "Statement of Purpose",
  "Resume / CV",
  "English Test Score",
];

const studyAbroadVideo =
  "https://www.youtube.com/embed/RCo0EHLqTVI?autoplay=1&mute=1&controls=0&loop=1&playlist=RCo0EHLqTVI&playsinline=1&rel=0&modestbranding=1";

export function AnimatedHome() {
  return (
    <main className="bg-[var(--background)] text-[var(--foreground)]">
      <section className="relative overflow-hidden border-b border-black/10 bg-black">
        <div className="absolute inset-0">
          <iframe
            src={studyAbroadVideo}
            title="Study abroad campus life"
            allow="autoplay; encrypted-media; picture-in-picture"
            className="pointer-events-none absolute inset-0 h-full w-full scale-[1.55] object-cover opacity-100"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,10,14,0.48)_0%,rgba(8,10,14,0.44)_18%,rgba(8,10,14,0.54)_42%,rgba(8,10,14,0.7)_70%,rgba(8,10,14,0.88)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.06),transparent_16%),linear-gradient(90deg,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0.14)_42%,rgba(0,0,0,0.32)_100%)]" />
        </div>

        <div className="relative mx-auto flex min-h-screen w-full max-w-[1800px] flex-col px-5 pb-10 pt-5 text-white sm:px-8 sm:pb-14 sm:pt-6">
          <div className="flex items-center justify-between border-b border-white/14 px-1 pb-2 sm:px-2">
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

          <div className="flex flex-1 items-start justify-center pt-1 sm:pt-2">
            <motion.div
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              <h1 className="text-center text-[clamp(6rem,18vw,17rem)] font-semibold uppercase leading-[0.85] tracking-[-0.085em] text-white/56 drop-shadow-[0_10px_28px_rgba(0,0,0,0.28)]">
                Endurance
              </h1>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-[1600px]">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={reveal}
            className="max-w-5xl"
          >
            <p className="font-mono text-[12px] uppercase tracking-[0.28em] text-[var(--muted)]">
              Required Documents
            </p>
            <h2 className="mt-6 text-[clamp(2.8rem,6vw,5.8rem)] font-medium leading-[0.96] tracking-[-0.07em] text-[#323543]">
              Upload documents once, then verify everything from the next page.
            </h2>
          </motion.div>

          <div className="mt-10 grid gap-6 border border-black/8 bg-[#f7f5f0] p-6 sm:p-8">
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.68, ease: [0.22, 1, 0.36, 1] }}
              className="grid gap-6 border border-black/10 bg-white/80 p-6 sm:grid-cols-[0.5fr_0.5fr] sm:items-center"
            >
              <div>
                <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-[var(--accent)]">
                  Unified intake
                </p>
                <h3 className="mt-4 text-[2rem] font-medium tracking-[-0.05em] text-[var(--foreground)]">
                  Upload all required documents in one flow
                </h3>
                <p className="mt-4 text-base leading-7 text-[var(--foreground-soft)]">
                  You can send Passport, Transcript, Bank Statement, SOP, Resume/CV, and English test score
                  together. The next screen will verify each and show which documents passed or failed.
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
                  Required documents
                </p>
                <ul className="space-y-1 text-sm leading-7 text-[var(--foreground-soft)]">
                  {requiredDocuments.map((name) => (
                    <li key={name}>• {name}</li>
                  ))}
                </ul>
              </div>
            </motion.article>

            <Link
              href="/portal"
              className="inline-flex w-full items-center justify-center border border-[var(--foreground)] bg-[var(--foreground)] px-4 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--background)] transition hover:opacity-92"
            >
              Upload documents
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-18 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-[1600px]">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={reveal}
            className="mx-auto max-w-[1400px] text-center"
          >
            <p className="font-mono text-[12px] uppercase tracking-[0.28em] text-[var(--muted)]">
              Endurance Platform
            </p>
            <h2 className="mt-8 text-[clamp(2.8rem,6vw,6.6rem)] font-medium leading-[0.98] tracking-[-0.07em] text-[#3f4350]">
              Endurance keeps passports, transcripts, financial proof, personal statements, resumes, and
              English scores visible from first upload to review-ready submission.
            </h2>
          </motion.div>
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
                Open the portal and run verification end to end.
              </h2>
            </div>
            <Link
              href="/portal"
              className="group inline-flex items-center gap-4 border border-[var(--foreground)] bg-[var(--foreground)] px-6 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--background)]"
            >
              Start Uploading
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

