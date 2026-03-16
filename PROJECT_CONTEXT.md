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
- The app remains Next.js static-export friendly through `next.config.ts` with `output: "export"`.
- Current operating mode is local-only development.
- If Firebase is re-added later, use `firebase init hosting` with `out` as the public directory.
- Do not choose App Hosting or server-side framework options if staying on the free plan.

## Known Notes
- The current verification store is in-memory (MVP).
- For production: move state and documents to persistent DB/object storage.
- `tmp_pdf/` is excluded from source control.

## Immediate Next Changes (when requested)
1. Persist application documents/state to a database and file storage.
2. Add stronger document authenticity checks (OCR / anti-tamper service).
3. Improve portal UI states and accessibility.
4. Add auth/role separation for students vs reviewers.

## Instructions for future work
Before every new change request, refer to this file first to align on:
- Current scope
- Existing implementation
- Planned next tasks
