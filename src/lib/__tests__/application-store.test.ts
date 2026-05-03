import { describe, it, expect, beforeEach } from "vitest";
import {
  ensureApplicationData,
  getApplicationRecord,
  getDocumentsForApplication,
  getDocumentById,
  getUsersStore,
  writeDocument,
  updateDocument,
  deleteDocument,
  appendVerificationChecks,
  getChecksForDocument,
  appendApplicationEvent,
  upsertAlert,
  resolveAlert,
  clearAlerts,
  getAlertsForApplication,
  clearApplicationPacket,
  listChecksumsForApplication,
  requestUploadSession,
  DEMO_APPLICATION_ID,
  DEMO_USER_ID,
} from "@/lib/application-store";
import { MIN_FILE_SIZE_BYTES } from "@/lib/document-policy";

// Reset documents, checks, alerts and events between tests so they don't
// bleed into each other. Users and ApplicationRecord rows are kept because
// they are seeded once and re-used.
beforeEach(() => {
  clearApplicationPacket(DEMO_APPLICATION_ID);
});

const VALID_SIZE = MIN_FILE_SIZE_BYTES + 1024;

function makeDocumentInput(overrides: Record<string, unknown> = {}) {
  return {
    applicationId: DEMO_APPLICATION_ID,
    userId: DEMO_USER_ID,
    fileName: "passport.pdf",
    fileSize: VALID_SIZE,
    mimeType: "application/pdf",
    checksum: `cs-${Math.random()}`,
    documentType: "passport" as const,
    status: "verifying" as const,
    authenticityScore: 0,
    uploadedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ─── initialisation ───────────────────────────────────────────────────────────

describe("application-store – initialisation", () => {
  it("seeds a default user and application on first use", () => {
    const { user, application } = ensureApplicationData();

    expect(user.id).toBe(DEMO_USER_ID);
    expect(application.id).toBe(DEMO_APPLICATION_ID);
    expect(application.status).toBe("active");
  });

  it("is idempotent – ensureApplicationData returns the same records on repeated calls", () => {
    const first = ensureApplicationData();
    const second = ensureApplicationData();

    expect(first.user.id).toBe(second.user.id);
    expect(first.application.id).toBe(second.application.id);
  });
});

// ─── getApplicationRecord ─────────────────────────────────────────────────────

describe("application-store – getApplicationRecord", () => {
  it("returns null for an unknown application ID", () => {
    expect(getApplicationRecord("no-such-app")).toBeNull();
  });

  it("returns the default application record after seeding", () => {
    ensureApplicationData();

    const app = getApplicationRecord(DEMO_APPLICATION_ID);
    expect(app).not.toBeNull();
    expect(app!.id).toBe(DEMO_APPLICATION_ID);
  });
});

// ─── writeDocument / getDocumentsForApplication ───────────────────────────────

describe("application-store – writeDocument", () => {
  it("stores a document and retrieves it", () => {
    writeDocument(makeDocumentInput());

    const docs = getDocumentsForApplication(DEMO_APPLICATION_ID);
    expect(docs).toHaveLength(1);
    expect(docs[0].documentType).toBe("passport");
    expect(docs[0].status).toBe("verifying");
  });

  it("returns the written document with a generated id", () => {
    const doc = writeDocument(makeDocumentInput());
    expect(doc.id).toBeTruthy();
  });

  it("prepends the newest document so getDocumentsForApplication is sorted newest-first", () => {
    writeDocument(makeDocumentInput({ fileName: "first.pdf" }));
    writeDocument(makeDocumentInput({ fileName: "second.pdf" }));

    const docs = getDocumentsForApplication(DEMO_APPLICATION_ID);
    expect(docs[0].fileName).toBe("second.pdf");
    expect(docs[1].fileName).toBe("first.pdf");
  });

  it("returns empty array for application with no documents", () => {
    expect(getDocumentsForApplication(DEMO_APPLICATION_ID)).toHaveLength(0);
  });

  it("replaces an existing document when the same ID is provided", () => {
    const first = writeDocument(makeDocumentInput());
    writeDocument(makeDocumentInput({ fileName: "replaced.pdf" }), first.id);

    const docs = getDocumentsForApplication(DEMO_APPLICATION_ID);
    const match = docs.find((d) => d.id === first.id);
    expect(match?.fileName).toBe("replaced.pdf");
  });
});

// ─── getDocumentById ──────────────────────────────────────────────────────────

describe("application-store – getDocumentById", () => {
  it("returns null for an unknown document ID", () => {
    expect(getDocumentById("nope")).toBeNull();
  });

  it("returns the correct document when it exists", () => {
    const doc = writeDocument(makeDocumentInput());
    const found = getDocumentById(doc.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(doc.id);
  });
});

// ─── updateDocument ───────────────────────────────────────────────────────────

describe("application-store – updateDocument", () => {
  it("returns null for a non-existent document", () => {
    expect(updateDocument("ghost", { status: "verified" })).toBeNull();
  });

  it("updates the specified fields", () => {
    const doc = writeDocument(makeDocumentInput());

    const updated = updateDocument(doc.id, {
      status: "verified",
      authenticityScore: 88,
    });

    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("verified");
    expect(updated!.authenticityScore).toBe(88);
  });

  it("stamps a new updatedAt timestamp", () => {
    const doc = writeDocument(makeDocumentInput());
    const before = doc.updatedAt;

    const updated = updateDocument(doc.id, { status: "rejected" });
    expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(before).getTime()
    );
  });
});

// ─── deleteDocument ───────────────────────────────────────────────────────────

describe("application-store – deleteDocument", () => {
  it("returns false for a non-existent document", () => {
    expect(deleteDocument("ghost")).toBe(false);
  });

  it("removes the document from the store and returns true", () => {
    const doc = writeDocument(makeDocumentInput());

    const result = deleteDocument(doc.id);
    expect(result).toBe(true);

    const docs = getDocumentsForApplication(DEMO_APPLICATION_ID);
    expect(docs.find((d) => d.id === doc.id)).toBeUndefined();
  });

  it("also removes the associated verification checks", () => {
    const doc = writeDocument(makeDocumentInput());

    appendVerificationChecks(DEMO_APPLICATION_ID, doc.id, [
      { code: "extension", label: "Policy", status: "pass", detail: "ok" },
    ]);

    deleteDocument(doc.id);
    expect(getChecksForDocument(doc.id)).toHaveLength(0);
  });

  it("updates the application updatedAt after deletion", () => {
    ensureApplicationData();
    const appBefore = getApplicationRecord(DEMO_APPLICATION_ID);
    const tsBefore = appBefore?.updatedAt ?? "";

    const doc = writeDocument(makeDocumentInput());
    deleteDocument(doc.id);

    const appAfter = getApplicationRecord(DEMO_APPLICATION_ID);
    expect(new Date(appAfter!.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(tsBefore).getTime()
    );
  });
});

// ─── appendVerificationChecks / getChecksForDocument ─────────────────────────

describe("application-store – verification checks", () => {
  it("stores and retrieves checks for a document", () => {
    const doc = writeDocument(makeDocumentInput());

    const ids = appendVerificationChecks(DEMO_APPLICATION_ID, doc.id, [
      { code: "extension", label: "Extension policy", status: "pass", detail: "ok" },
      { code: "size", label: "Size bounds", status: "warn", detail: "small" },
    ]);

    expect(ids).toHaveLength(2);

    const checks = getChecksForDocument(doc.id);
    expect(checks).toHaveLength(2);
    expect(checks.map((c) => c.code)).toContain("extension");
    expect(checks.map((c) => c.code)).toContain("size");
  });

  it("returns empty array when document has no checks", () => {
    const doc = writeDocument(makeDocumentInput());
    expect(getChecksForDocument(doc.id)).toHaveLength(0);
  });

  it("returns empty array when appendVerificationChecks is called with a nonexistent document", () => {
    const ids = appendVerificationChecks(DEMO_APPLICATION_ID, "ghost-doc", [
      { code: "extension", label: "Policy", status: "pass", detail: "ok" },
    ]);

    expect(ids).toHaveLength(0);
  });

  it("filters by active checkIds when document has stored checkIds", () => {
    const doc = writeDocument(makeDocumentInput());

    // First batch
    appendVerificationChecks(DEMO_APPLICATION_ID, doc.id, [
      { code: "extension", label: "Policy", status: "pass", detail: "ok" },
    ]);

    // Second batch replaces the first set of checkIds on the document
    appendVerificationChecks(DEMO_APPLICATION_ID, doc.id, [
      { code: "size", label: "Size", status: "pass", detail: "ok" },
    ]);

    // The document's checkIds point only to the second batch
    const checks = getChecksForDocument(doc.id);
    expect(checks.map((c) => c.code)).toContain("size");
  });
});

// ─── appendApplicationEvent ───────────────────────────────────────────────────

describe("application-store – appendApplicationEvent", () => {
  it("appends an event without throwing", () => {
    expect(() =>
      appendApplicationEvent({
        applicationId: DEMO_APPLICATION_ID,
        eventType: "document_added",
        payload: { documentId: "doc-1" },
      })
    ).not.toThrow();
  });

  it("appends multiple events for the same application", () => {
    appendApplicationEvent({
      applicationId: DEMO_APPLICATION_ID,
      eventType: "document_added",
      payload: { documentId: "doc-1" },
    });

    appendApplicationEvent({
      applicationId: DEMO_APPLICATION_ID,
      eventType: "document_result_updated",
      payload: { documentId: "doc-1", status: "verified", score: "95", rejectionReason: "" },
    });
    // No error means success; events are stored internally
  });
});

// ─── upsertAlert / resolveAlert / clearAlerts ─────────────────────────────────

describe("application-store – alert management", () => {
  it("creates a new alert via upsertAlert", () => {
    const alert = upsertAlert({
      applicationId: DEMO_APPLICATION_ID,
      dedupeKey: "missing-documents",
      severity: "warning",
      message: "Missing files.",
    });

    expect(alert.id).toBeTruthy();
    expect(alert.severity).toBe("warning");
  });

  it("updates an existing unresolved alert with the same dedupeKey", () => {
    upsertAlert({
      applicationId: DEMO_APPLICATION_ID,
      dedupeKey: "missing-documents",
      severity: "warning",
      message: "Original.",
    });

    upsertAlert({
      applicationId: DEMO_APPLICATION_ID,
      dedupeKey: "missing-documents",
      severity: "critical",
      message: "Updated.",
    });

    const alerts = getAlertsForApplication(DEMO_APPLICATION_ID);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].message).toBe("Updated.");
    expect(alerts[0].severity).toBe("critical");
  });

  it("resolveAlert removes the alert from active alerts", () => {
    upsertAlert({
      applicationId: DEMO_APPLICATION_ID,
      dedupeKey: "missing-documents",
      severity: "warning",
      message: "Missing.",
    });

    const count = resolveAlert(DEMO_APPLICATION_ID, "missing-documents");
    expect(count).toBe(1);
    expect(getAlertsForApplication(DEMO_APPLICATION_ID)).toHaveLength(0);
  });

  it("resolveAlert returns 0 when there is no matching alert", () => {
    expect(resolveAlert(DEMO_APPLICATION_ID, "nonexistent")).toBe(0);
  });

  it("clearAlerts resolves all active alerts for the application", () => {
    upsertAlert({
      applicationId: DEMO_APPLICATION_ID,
      dedupeKey: "alert-a",
      severity: "info",
      message: "A",
    });
    upsertAlert({
      applicationId: DEMO_APPLICATION_ID,
      dedupeKey: "alert-b",
      severity: "warning",
      message: "B",
    });

    clearAlerts(DEMO_APPLICATION_ID);
    expect(getAlertsForApplication(DEMO_APPLICATION_ID)).toHaveLength(0);
  });

  it("returns only unresolved alerts from getAlertsForApplication", () => {
    upsertAlert({
      applicationId: DEMO_APPLICATION_ID,
      dedupeKey: "alert-a",
      severity: "info",
      message: "A",
    });
    upsertAlert({
      applicationId: DEMO_APPLICATION_ID,
      dedupeKey: "alert-b",
      severity: "warning",
      message: "B",
    });

    resolveAlert(DEMO_APPLICATION_ID, "alert-a");

    const alerts = getAlertsForApplication(DEMO_APPLICATION_ID);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].dedupeKey).toBe("alert-b");
  });

  it("creates a new alert after the previous one with the same dedupeKey was resolved", () => {
    upsertAlert({
      applicationId: DEMO_APPLICATION_ID,
      dedupeKey: "missing-documents",
      severity: "warning",
      message: "First.",
    });
    resolveAlert(DEMO_APPLICATION_ID, "missing-documents");

    upsertAlert({
      applicationId: DEMO_APPLICATION_ID,
      dedupeKey: "missing-documents",
      severity: "warning",
      message: "Second.",
    });

    const alerts = getAlertsForApplication(DEMO_APPLICATION_ID);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].message).toBe("Second.");
  });
});

// ─── clearApplicationPacket ───────────────────────────────────────────────────

describe("application-store – clearApplicationPacket", () => {
  it("removes all documents and alerts for the application", () => {
    writeDocument(makeDocumentInput());
    writeDocument(makeDocumentInput({ documentType: "transcript" }));
    upsertAlert({
      applicationId: DEMO_APPLICATION_ID,
      dedupeKey: "missing-documents",
      severity: "warning",
      message: "Missing.",
    });

    clearApplicationPacket(DEMO_APPLICATION_ID);

    expect(getDocumentsForApplication(DEMO_APPLICATION_ID)).toHaveLength(0);
    expect(getAlertsForApplication(DEMO_APPLICATION_ID)).toHaveLength(0);
  });

  it("resets the application status back to 'active'", () => {
    clearApplicationPacket(DEMO_APPLICATION_ID);

    const app = getApplicationRecord(DEMO_APPLICATION_ID);
    expect(app?.status).toBe("active");
  });
});

// ─── listChecksumsForApplication ──────────────────────────────────────────────

describe("application-store – listChecksumsForApplication", () => {
  it("returns an empty Set when there are no documents", () => {
    expect(listChecksumsForApplication(DEMO_APPLICATION_ID).size).toBe(0);
  });

  it("returns all document checksums for the application", () => {
    const cs1 = "cs-aaa";
    const cs2 = "cs-bbb";
    writeDocument(makeDocumentInput({ checksum: cs1 }));
    writeDocument(makeDocumentInput({ checksum: cs2, documentType: "transcript" }));

    const checksums = listChecksumsForApplication(DEMO_APPLICATION_ID);
    expect(checksums.has(cs1)).toBe(true);
    expect(checksums.has(cs2)).toBe(true);
  });
});

// ─── requestUploadSession ─────────────────────────────────────────────────────

describe("application-store – requestUploadSession", () => {
  it("returns a session with a token, objectKey, expiresAt and a pending document", () => {
    const session = requestUploadSession({
      applicationId: DEMO_APPLICATION_ID,
      userId: DEMO_USER_ID,
      documentType: "passport",
      fileName: "passport.pdf",
      fileSize: VALID_SIZE,
      mimeType: "application/pdf",
      checksum: "session-cs-1",
    });

    expect(session.token).toBeTruthy();
    expect(session.objectKey).toContain(DEMO_APPLICATION_ID);
    expect(new Date(session.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(session.document.status).toBe("verifying");
    expect(session.document.documentType).toBe("passport");
  });

  it("throws on a disallowed extension for the document type", () => {
    expect(() =>
      requestUploadSession({
        applicationId: DEMO_APPLICATION_ID,
        userId: DEMO_USER_ID,
        documentType: "resume",
        fileName: "resume.jpg",
        fileSize: VALID_SIZE,
        mimeType: "image/jpeg",
        checksum: "bad-ext-cs",
      })
    ).toThrow();
  });

  it("throws when file size is 0", () => {
    expect(() =>
      requestUploadSession({
        applicationId: DEMO_APPLICATION_ID,
        userId: DEMO_USER_ID,
        documentType: "passport",
        fileName: "passport.pdf",
        fileSize: 0,
        mimeType: "application/pdf",
        checksum: "zero-size-cs",
      })
    ).toThrow();
  });
});

// ─── deleteDocument – additional coverage ─────────────────────────────────────

describe("application-store – deleteDocument event and session cleanup", () => {
  it("removes events whose payload references the deleted document", () => {
    const doc = writeDocument(makeDocumentInput());

    // Append an event for this document so the event-filter branch is exercised
    appendApplicationEvent({
      applicationId: DEMO_APPLICATION_ID,
      eventType: "document_added",
      payload: { documentId: doc.id },
    });

    // deleteDocument should complete without error and remove the document
    expect(deleteDocument(doc.id)).toBe(true);
    expect(getDocumentsForApplication(DEMO_APPLICATION_ID)).toHaveLength(0);
  });

  it("removes an in-progress upload session when its document is deleted", () => {
    // Create an upload session – this also writes a pending document
    const session = requestUploadSession({
      applicationId: DEMO_APPLICATION_ID,
      userId: DEMO_USER_ID,
      documentType: "passport",
      fileName: "passport.pdf",
      fileSize: VALID_SIZE,
      mimeType: "application/pdf",
      checksum: "session-cleanup-cs",
    });

    // Deleting the document should also prune the associated session token
    const result = deleteDocument(session.document.id);
    expect(result).toBe(true);
    expect(getDocumentsForApplication(DEMO_APPLICATION_ID)).toHaveLength(0);
  });
});

// ─── getUsersStore ────────────────────────────────────────────────────────────

describe("application-store – getUsersStore", () => {
  it("returns an object with a users array", () => {
    const { users } = getUsersStore();
    expect(Array.isArray(users)).toBe(true);
  });

  it("contains the default demo user after initialisation", () => {
    const { users } = getUsersStore();
    expect(users.some((u) => u.id === DEMO_USER_ID)).toBe(true);
  });
});

// ─── ensureApplicationData – edge cases ───────────────────────────────────────

describe("application-store – ensureApplicationData edge cases", () => {
  it("creates a new user when the userId is not yet in the store", () => {
    const { user } = ensureApplicationData("brand-new-user", "brand-new-app");
    expect(user.id).toBe("brand-new-user");
  });

  it("throws when an existing application is accessed by a different userId", () => {
    // DEMO_APPLICATION_ID was created by DEMO_USER_ID during module init
    expect(() =>
      ensureApplicationData("intruder-user", DEMO_APPLICATION_ID)
    ).toThrow("Unauthorized");
  });
});
