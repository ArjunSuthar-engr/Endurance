Endurance Portal

Endurance is a student-facing portal for study-abroad document intake.
The site includes upload verification, missing-document alerts, and progress tracking.

- Deployment target: not currently configured
- Current mode: local development only
- Optional future hosting path: static export

## What this project does

- Presents a dedicated onboarding home page for the document workflow
- Provides a `/portal` route for uploading documents
- Runs document checks in the browser (free-plan, static-compatible path)
  - MIME type policy
  - File extension policy
  - File size boundaries
  - Binary signature checks for pdf/png/jpg
  - Duplicate checksum detection
  - Filename risk and document-intent heuristics
- Tracks application progress against required documents
- Generates alerts for missing required documents and rejected uploads

## State behavior

- Verification state is maintained client-side through `src/lib/student-application-service.ts`.
- The portal polls local state every ~1.2 seconds so verification completion updates appear in the UI.

## Local development

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Build

```bash
npm run build
npm run lint
```

`npm run build` writes a static export to `out/` (generated and ignored by git).

## Firebase setup

Firebase config has been removed from this repo.
This project is currently intended to run locally.

If Firebase is added again later, keep it static-export based and free-plan friendly.

## Project structure

- `src/app/portal/page.tsx` — portal route
- `src/components/student-portal.tsx` — upload + verification UI
- `src/lib/student-application-schema.ts` — document types and state models
- `src/lib/student-application-service.ts` — verification and state logic
- `src/app/[slug]/page.tsx` — pre-rendered slug pages for static export

## Notes

- This implementation uses an in-memory store for MVP behavior.
- For production, replace state with persistent backend storage and file storage service.

## Commit format

Commits follow the format:

`vX.Y.Z Your commit message`

`X = major`, `Y = minor`, `Z = patch`.
