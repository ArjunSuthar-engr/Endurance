# Endurance Constraint-First Implementation Plan

## Purpose

This plan is the single file to follow for productionizing the Student Application & Document Verification System against the critical constraint:

- no simple cloud-drive behavior
- automated authenticity checks on each upload
- triggered logic for missing required documents
- visible, real-time user feedback on progress, failures, and alerts

For each step below:
- complete everything listed in order,
- commit once when the step is finished,
- then move only to the next step.

## Commit format

`vX.Y.Z <short step description>`

---

## Step 0 — Constraint Baseline & Scope Lock

- Confirm the exact required document set in `src/lib/student-application-schema.ts`.
- Ensure the app has exactly one intake path from home to `/portal`.
- Confirm all current logic that simulates persistence is marked as MVP and does not get mistaken for production truth.
- Add this plan to `PROJECT_CONTEXT.md` as the active guidance file.

Acceptance:
- One-page statement in docs describing "what is still fake (MVP)" and "what is production."
- No feature changes without corresponding acceptance criteria.

## Step 1 — Backend-First State Model

- Introduce server-backed data model (Auth + DB + Storage) for:
  - users
  - applications
  - documents
  - verification checks
  - alerts
- Enforce immutable IDs and status transitions at write time.
- Add indexes:
  - user/application
  - documentType + status
  - application + updatedAt

Acceptance:
- Every write/retrieval of document state comes from server DB, not `localStorage`.

## Step 2 — Secure Upload Ingress (Replace Client-Only Upload Logic)

- Add API route to request upload session or signed URL.
- Validate upload requests server-side:
  - user ownership
  - application ownership
  - max file size
  - declared extension/mime schema
- Store document metadata first with status `verifying`.
- Persist raw object key/path in server storage (private bucket only).
- Return upload result token to client.

Acceptance:
- Files are never written directly from browser to public bucket.

## Step 3 — Automated Authenticity Pipeline (Core Constraint)

- Run all verification checks server-side for every upload event:
  - extension/mime policy
  - byte-size policy
  - binary signature check
  - checksum generation + duplicate check
  - filename hygiene checks
  - optionally OCR/metadata extraction checks if available
- Persist every check as separate immutable records.
- Compute authenticity score and final document status from check outcomes.

Acceptance:
- No document can become `verified` without passing required check bundle.
- Each check entry is queryable and tied to document ID.

## Step 4 — Required-Document Rule Engine and Missing-File Alerts

- Build rule evaluator for:
  - missing required docs
  - rejected required docs
  - verification in-progress states
- Emit structured, deduplicated alerts:
  - `missing-documents`
  - `rejected-documents`
  - `verification-running`
- Store alert history and severity with `resolvedAt`.

Acceptance:
- Alert exists/updates within one poll cycle or push event after every relevant state change.

## Step 5 — Real-Time Sync (No Poll-Only UX)

- Replace polling fallback with SSE/WebSocket or equivalent.
- Keep poll fallback only if required by infra.
- Add optimistic submission state:
  - uploading
  - queued for verification
  - verification result

Acceptance:
- Upload action updates UI immediately and then transitions automatically through pipeline statuses.

## Step 6 — Strict Auth and Authorization

- Add authentication with roles: `student`, `reviewer`, `admin`.
- Protect `/portal`, APIs, and document endpoints.
- Enforce ownership checks on every document read/write.
- Add session/session invalidation behavior.

Acceptance:
- Any unauthorized request is denied and logged.

## Step 7 — Notification Surface and User Guidance

- Surface server-published alerts in `/portal`.
- Show explicit next actions:
  - which documents are missing
  - why a document was rejected
  - how to re-upload
- Keep all alert messages user-actionable and non-technical.

Acceptance:
- User can see at least one actionable message after rejection or missing-document event.

## Step 8 — Reviewer/Admin Surface (Post-Graduation)

- Add reviewer dashboard for pending applications.
- Allow manual override with comment and audit trail.
- Show immutable check evidence per document.

Acceptance:
- Reviewers can never edit or delete core check records, only append decisions/comments.

## Step 9 — Operational Hardening

- Add retry/backoff for verification workers.
- Add dead-letter for persistent failures.
- Add structured logs for upload, verification, alerting, and state changes.
- Add dashboards for:
  - queue depth
  - verification duration
  - rejection reasons

Acceptance:
- Failures are recoverable and diagnosable without data loss.

## Step 10 — Compliance and Release Readiness

- Add deletion/retention and evidence retention rules.
- Add security scan and endpoint abuse protections.
- Final acceptance run:
  - all required docs uploaded -> complete coverage
  - one missing doc -> missing alert
  - duplicate/rejected doc -> rejected status + alert
  - live progress and notifications work end-to-end
- Tag and freeze for production.

Acceptance:
- Constraint statement is demonstrably met in integration flow and documented.

## Execution Note

Use this file as the source of truth for next commits. The existing `implementation_plan.md` remains a broader roadmap.
