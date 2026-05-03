import { describe, it, expect, beforeEach } from "vitest";
import {
  ensureApplicationData,
  getApplicationRecord,
  getDocumentsForApplication,
  getDocumentById,
  writeDocument,
  updateDocument,
  appendVerificationChecks,
  getChecksForDocument,
  appendApplicationEvent,
  upsertAlert,
  resolveAlert,
  clearAlerts,
  getAlertsForApplication,
  listChecksumsForApplication,
  requestUploadSession,
  getUsersStore,
  DEMO_APPLICATION_ID,
  DEMO_USER_ID,
} from "@/lib/server-application-store";
import { MIN_FILE_SIZE_BYTES } from "@/lib/document-policy";

// Reset the in-memory global store before every test for isolation.
beforeEach(() => {
  const g = globalThis as { __enduranceBackendStore?: unknown };
  delete g.__enduranceBackendStore;
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

// ─── ensureApplicationData ────────────────────────────────────────────────────

describe("ensureApplicationData", () => {
  it("returns the default demo user and application", () => {
    const { user, application } = ensureApplicationData();

    expect(user.id).toBe(DEMO_USER_ID);
    expect(application.id).toBe(DEMO_APPLICATION_ID);
    expect(application.userId).toBe(DEMO_USER_ID);
  });

  it("is idempotent – calling twice returns the same records", () => {
    const first = ensureApplicationData();
    const second = ensureApplicationData();

    expect(first.user.id).toBe(second.user.id);
    expect(first.application.id).toBe(second.application.id);
  });

  it("creates a custom user and application when IDs are provided", () => {
    const { user, application } = ensureApplicationData("custom-user", "custom-app");

    expect(user.id).toBe("custom-user");
    expect(application.id).toBe("custom-app");
    expect(application.userId).toBe("custom-user");
  });

  it("throws when the same applicationId is accessed by a different userId", () => {
    ensureApplicationData("user-a", "shared-app");

    expect(() => ensureApplicationData("user-b", "shared-app")).toThrow("Unauthorized");
  });
});

// ─── getUsersStore ────────────────────────────────────────────────────────────

describe("getUsersStore", () => {
  it("returns a store with a users array", () => {
    const store = getUsersStore();
    expect(Array.isArray(store.users)).toBe(true);
  });

  it("contains the default demo user after initialisation", () => {
    const store = getUsersStore();
    const demoUser = store.users.find((u) => u.id === DEMO_USER_ID);
    expect(demoUser).toBeDefined();
    expect(demoUser!.role).toBe("student");
  });
});

// ─── getApplicationRecord ─────────────────────────────────────────────────────

describe("getApplicationRecord", () => {
  it("returns null for an unknown application ID", () => {
    expect(getApplicationRecord("nonexistent")).toBeNull();
  });

  it("returns the application for the demo ID after initialisation", () => {
    ensureApplicationData();
    const app = getApplicationRecord(DEMO_APPLICATION_ID);
    expect(app).not.toBeNull();
    expect(app!.id).toBe(DEMO_APPLICATION_ID);
  });
});

// ─── writeDocument / getDocumentsForApplication ───────────────────────────────

describe("writeDocument", () => {
  it("stores a document and retrieves it via getDocumentsForApplication", () => {
    ensureApplicationData();
    const input = makeDocumentInput();
    writeDocument(input);

    const docs = getDocumentsForApplication(DEMO_APPLICATION_ID);
    expect(docs).toHaveLength(1);
    expect(docs[0].fileName).toBe("passport.pdf");
    expect(docs[0].documentType).toBe("passport");
    expect(docs[0].status).toBe("verifying");
  });

  it("returns the written document record", () => {
    ensureApplicationData();
    const input = makeDocumentInput({ fileName: "transcript.pdf", documentType: "transcript" });
    const doc = writeDocument(input);

    expect(doc.id).toBeTruthy();
    expect(doc.fileName).toBe("transcript.pdf");
  });

  it("replaces an existing document when the same ID is provided", () => {
    ensureApplicationData();
    const first = writeDocument(makeDocumentInput());
    writeDocument(makeDocumentInput({ fileName: "replaced.pdf" }), first.id);

    const docs = getDocumentsForApplication(DEMO_APPLICATION_ID);
    const match = docs.find((d) => d.id === first.id);
    expect(match?.fileName).toBe("replaced.pdf");
  });

  it("returns empty array for an application with no documents", () => {
    ensureApplicationData();
    const docs = getDocumentsForApplication(DEMO_APPLICATION_ID);
    expect(docs).toHaveLength(0);
  });

  it("does not return documents belonging to a different application", () => {
    ensureApplicationData();
    ensureApplicationData("other-user", "other-app");
    writeDocument(makeDocumentInput({ applicationId: "other-app", userId: "other-user" }));

    const docs = getDocumentsForApplication(DEMO_APPLICATION_ID);
    expect(docs).toHaveLength(0);
  });
});

// ─── getDocumentById ──────────────────────────────────────────────────────────

describe("getDocumentById", () => {
  it("returns null for an unknown document ID", () => {
    expect(getDocumentById("nonexistent")).toBeNull();
  });

  it("returns the document when it exists", () => {
    ensureApplicationData();
    const doc = writeDocument(makeDocumentInput());
    const found = getDocumentById(doc.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(doc.id);
  });
});

// ─── updateDocument ───────────────────────────────────────────────────────────

describe("updateDocument", () => {
  it("returns null for an unknown document ID", () => {
    expect(updateDocument("nonexistent", { status: "verified" })).toBeNull();
  });

  it("updates the document status", () => {
    ensureApplicationData();
    const doc = writeDocument(makeDocumentInput());
    const updated = updateDocument(doc.id, { status: "verified", authenticityScore: 95 });

    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("verified");
    expect(updated!.authenticityScore).toBe(95);
  });

  it("updates updatedAt timestamp on every update", () => {
    ensureApplicationData();
    const doc = writeDocument(makeDocumentInput());
    const before = doc.updatedAt;

    // Advance time slightly
    const updated = updateDocument(doc.id, { status: "rejected" });
    expect(updated!.updatedAt).toBeDefined();
    // updatedAt should be a valid ISO string
    expect(() => new Date(updated!.updatedAt)).not.toThrow();
    // The new timestamp should be >= the original
    expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime());
  });
});

// ─── appendVerificationChecks / getChecksForDocument ─────────────────────────

describe("appendVerificationChecks / getChecksForDocument", () => {
  it("stores verification checks and returns them for the document", () => {
    ensureApplicationData();
    const doc = writeDocument(makeDocumentInput());

    const checks = [
      { code: "extension", label: "File extension policy", status: "pass" as const, detail: "ok" },
      { code: "size", label: "File size bounds", status: "pass" as const, detail: "ok" },
    ];

    const checkIds = appendVerificationChecks(DEMO_APPLICATION_ID, doc.id, checks);
    expect(checkIds).toHaveLength(2);

    const stored = getChecksForDocument(doc.id);
    expect(stored).toHaveLength(2);
    expect(stored[0].code).toBe("extension");
    expect(stored[1].code).toBe("size");
  });

  it("returns an empty array when there are no checks for a document", () => {
    ensureApplicationData();
    const doc = writeDocument(makeDocumentInput());
    expect(getChecksForDocument(doc.id)).toHaveLength(0);
  });

  it("returns empty array for appendVerificationChecks when document does not exist", () => {
    ensureApplicationData();
    const checks = [
      { code: "extension", label: "Policy", status: "pass" as const, detail: "ok" },
    ];
    const ids = appendVerificationChecks(DEMO_APPLICATION_ID, "nonexistent-doc", checks);
    expect(ids).toHaveLength(0);
  });
});

// ─── appendApplicationEvent ───────────────────────────────────────────────────

describe("appendApplicationEvent", () => {
  it("appends an event to the store without throwing", () => {
    ensureApplicationData();
    expect(() =>
      appendApplicationEvent({
        applicationId: DEMO_APPLICATION_ID,
        eventType: "document_added",
        payload: { documentId: "doc-1" },
      })
    ).not.toThrow();
  });

  it("appends multiple events for the same application", () => {
    ensureApplicationData();
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

    // Events are stored; no direct public getter exists so we verify no errors
  });
});

// ─── upsertAlert / resolveAlert / getAlertsForApplication ────────────────────

describe("upsertAlert", () => {
  it("creates a new alert and returns it", () => {
    ensureApplicationData();
    const alert = upsertAlert({
      applicationId: DEMO_APPLICATION_ID,
      dedupeKey: "missing-documents",
      severity: "warning",
      message: "Missing required files.",
    });

    expect(alert.id).toBeTruthy();
    expect(alert.severity).toBe("warning");
    expect(alert.message).toBe("Missing required files.");
  });

  it("updates an existing unresolved alert with the same dedupeKey instead of creating a new one", () => {
    ensureApplicationData();
    upsertAlert({
      applicationId: DEMO_APPLICATION_ID,
      dedupeKey: "missing-documents",
      severity: "warning",
      message: "Original message.",
    });

    upsertAlert({
      applicationId: DEMO_APPLICATION_ID,
      dedupeKey: "missing-documents",
      severity: "critical",
      message: "Updated message.",
    });

    const alerts = getAlertsForApplication(DEMO_APPLICATION_ID);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].message).toBe("Updated message.");
    expect(alerts[0].severity).toBe("critical");
  });

  it("creates a second alert after the first has been resolved", () => {
    ensureApplicationData();
    upsertAlert({
      applicationId: DEMO_APPLICATION_ID,
      dedupeKey: "missing-documents",
      severity: "warning",
      message: "First alert.",
    });

    resolveAlert(DEMO_APPLICATION_ID, "missing-documents");

    upsertAlert({
      applicationId: DEMO_APPLICATION_ID,
      dedupeKey: "missing-documents",
      severity: "warning",
      message: "Second alert.",
    });

    const alerts = getAlertsForApplication(DEMO_APPLICATION_ID);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].message).toBe("Second alert.");
  });
});

describe("resolveAlert", () => {
  it("resolves the matching alert and returns the count resolved", () => {
    ensureApplicationData();
    upsertAlert({
      applicationId: DEMO_APPLICATION_ID,
      dedupeKey: "missing-documents",
      severity: "warning",
      message: "Missing files.",
    });

    const count = resolveAlert(DEMO_APPLICATION_ID, "missing-documents");
    expect(count).toBe(1);

    const remaining = getAlertsForApplication(DEMO_APPLICATION_ID);
    expect(remaining).toHaveLength(0);
  });

  it("returns 0 when there is no matching unresolved alert", () => {
    ensureApplicationData();
    const count = resolveAlert(DEMO_APPLICATION_ID, "nonexistent-key");
    expect(count).toBe(0);
  });

  it("does not resolve alerts belonging to a different application", () => {
    ensureApplicationData();
    ensureApplicationData("user2", "app2");
    upsertAlert({
      applicationId: DEMO_APPLICATION_ID,
      dedupeKey: "missing-documents",
      severity: "warning",
      message: "Demo missing.",
    });

    resolveAlert("app2", "missing-documents");
    const remaining = getAlertsForApplication(DEMO_APPLICATION_ID);
    expect(remaining).toHaveLength(1);
  });
});

describe("clearAlerts", () => {
  it("resolves all unresolved alerts for the application", () => {
    ensureApplicationData();
    upsertAlert({
      applicationId: DEMO_APPLICATION_ID,
      dedupeKey: "missing-documents",
      severity: "warning",
      message: "A",
    });
    upsertAlert({
      applicationId: DEMO_APPLICATION_ID,
      dedupeKey: "rejected-documents",
      severity: "critical",
      message: "B",
    });

    clearAlerts(DEMO_APPLICATION_ID);
    expect(getAlertsForApplication(DEMO_APPLICATION_ID)).toHaveLength(0);
  });
});

describe("getAlertsForApplication", () => {
  it("returns an empty array when there are no alerts", () => {
    ensureApplicationData();
    expect(getAlertsForApplication(DEMO_APPLICATION_ID)).toHaveLength(0);
  });

  it("returns only unresolved alerts", () => {
    ensureApplicationData();
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
});

// ─── listChecksumsForApplication ──────────────────────────────────────────────

describe("listChecksumsForApplication", () => {
  it("returns an empty Set when there are no documents", () => {
    ensureApplicationData();
    const checksums = listChecksumsForApplication(DEMO_APPLICATION_ID);
    expect(checksums.size).toBe(0);
  });

  it("returns checksums for all documents in the application", () => {
    ensureApplicationData();
    const cs1 = "checksum-aaa";
    const cs2 = "checksum-bbb";
    writeDocument(makeDocumentInput({ checksum: cs1 }));
    writeDocument(makeDocumentInput({ checksum: cs2, documentType: "transcript" }));

    const checksums = listChecksumsForApplication(DEMO_APPLICATION_ID);
    expect(checksums.has(cs1)).toBe(true);
    expect(checksums.has(cs2)).toBe(true);
    expect(checksums.size).toBe(2);
  });
});

// ─── requestUploadSession ─────────────────────────────────────────────────────

describe("requestUploadSession", () => {
  it("creates an upload session and a pending document", () => {
    ensureApplicationData();
    const session = requestUploadSession({
      applicationId: DEMO_APPLICATION_ID,
      userId: DEMO_USER_ID,
      documentType: "passport",
      fileName: "passport.pdf",
      fileSize: VALID_SIZE,
      mimeType: "application/pdf",
      checksum: "upload-cs-1",
    });

    expect(session.token).toBeTruthy();
    expect(session.objectKey).toContain(DEMO_APPLICATION_ID);
    expect(session.document.status).toBe("verifying");
    expect(session.document.documentType).toBe("passport");
    expect(new Date(session.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("throws when the file extension is not allowed for the document type", () => {
    ensureApplicationData();
    expect(() =>
      requestUploadSession({
        applicationId: DEMO_APPLICATION_ID,
        userId: DEMO_USER_ID,
        documentType: "statementOfPurpose",
        fileName: "sop.jpg",
        fileSize: VALID_SIZE,
        mimeType: "image/jpeg",
        checksum: "bad-cs",
      })
    ).toThrow();
  });

  it("throws when the file size is 0", () => {
    ensureApplicationData();
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
