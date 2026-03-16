# Endurance Project Context

## Purpose
Endurance is a student document intake portal for study-abroad applications with automated verification logic and live status updates.

## Current Scope (v1.0.x)
- Student portal route: `/portal`
- Real-time state polling and progress tracking
- Required documents:
  - Passport
  - Academic Transcript
  - Bank Statement
  - Statement of Purpose
  - Resume / CV
  - English Test Score
- Automated verification checks:
  - MIME type policy
  - File extension policy
  - File size bounds
  - Binary signature checks for pdf/png/jpg
  - Duplicate checksum detection
  - Filename risk and document-intent heuristics
- Triggered alerts for:
  - Missing required documents
  - Rejected files
  - Verification queue status

## Current Scope Decision
- Active production stack target: Next.js server-capable app (App Router with API routes) + Firebase Auth + Firestore + Cloud Storage.
- Hosting model for production: server-rendered Next.js deployment (no static-only export).
- Next.config now intentionally no longer uses `output: "export"`.

## Active Execution Plan

- Active plan file: `implementationplan.md`
- Current plan step: Step 2 — Secure Upload Ingress (Replace Client-Only Upload Logic)
- Current step rationale: Upload now enters through `request-upload-session` API action (`/api/application`), validates declared document metadata server-side, and creates a protected object key placeholder before verification transitions.
- Next action: add full server-side authenticity workers and immutable check records in Step 3.

## Constraint Baseline Lock (Step 0)

- Required documents are fixed to six types in `src/lib/student-application-schema.ts`:
  - `passport`, `transcript`, `bankStatement`, `statementOfPurpose`, `resume`, `englishTest`.
- Home page intake remains a single path: homepage CTAs route to `/portal`.
- Current storage remains local/demo-only (`localStorage` in `src/lib/application-store.ts`) and is not production-truth.
- Production implementation must use backend persistence before claiming full constraint compliance.

## Implemented Files
- `src/app/portal/page.tsx`
- `src/components/student-portal.tsx`
- `src/lib/student-application-schema.ts`
- `src/lib/student-application-service.ts`
- `src/components/animated-home.tsx`
- `src/components/site-header.tsx`
- `src/components/plus-burst-nav.tsx`
- `src/app/[slug]/page.tsx`
- `src/app/layout.tsx`
- `src/app/globals.css`
- `COMMIT_STRUCTURE.md`
- `README.md`
- `.env.example`
- `next.config.ts`
- `implementationplan.md`
- `src/lib/server-config.ts`
- `middleware.ts`
- `src/lib/application-store.ts`

## Git and Remote Notes
- Branch: `master`
- Commit format: `vX.Y.Z <message>`
  - `X` major, `Y` minor, `Z` patch
- Identity used in this repo:
  - `Arjun Suthar`
  - `arjunsutar.engr@gmail.com`
- Remote: `origin` points to `git@github.com-first:ArjunSuthar-engr/Endurance.git`

## Firebase Deployment Notes
- Firebase config files have been removed from the repo.
- Production path is now server-aware and no longer requires static-export-only output.
- Current operating mode is local-only development.
- If Firebase is re-added, use a deployment path that supports Next.js APIs (not static-only hosting).

## Known Notes
- The verification state is now persisted in-browser via a local persistence layer (`localStorage`-backed demo table model).
- For production: move the same table model to server-backed DB/object storage.
- `tmp_pdf/` is excluded from source control.
- upload flow bug fix: switched ID generation from extracted `randomUUID` function to direct crypto invocation to prevent `Illegal invocation` in browsers where detached method calls are disallowed.
- Non-negotiable constraint coverage:
  - Automated authenticity checks must run on every uploaded document.
  - Missing required files must trigger explicit missing-document notifications.
  - State and progress must update automatically after each upload and verification result.

## Immediate Next Changes (when requested)
1. Add stronger document authenticity checks (OCR / anti-tamper service).
2. Improve portal UI states and accessibility.
3. Add auth/role separation for students vs reviewers.

## Instructions for future work
Before every new change request, refer to this file first to align on:
- Current scope
- Existing implementation
- Planned next tasks
- Current execution step
