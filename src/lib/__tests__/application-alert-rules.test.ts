import { describe, it, expect } from "vitest";
import {
  getRequirementStatus,
  evaluateAlertRules,
} from "@/lib/application-alert-rules";
import type { DocumentType, UploadedDocument, VerificationStatus } from "@/lib/student-application-schema";
import { requiredDocumentTypes } from "@/lib/student-application-schema";

let _docCounter = 0;

function makeDocument(
  documentType: DocumentType,
  status: VerificationStatus,
  overrides: Partial<UploadedDocument> = {}
): UploadedDocument {
  _docCounter += 1;
  return {
    id: `doc-${_docCounter}`,
    fileName: `${documentType}.pdf`,
    fileSize: 50_000,
    mimeType: "application/pdf",
    checksum: `cs-${_docCounter}`,
    documentType,
    status,
    uploadedAt: new Date().toISOString(),
    authenticityScore: 100,
    checks: [],
    ...overrides,
  };
}

function makeAllVerified(): UploadedDocument[] {
  return requiredDocumentTypes.map((type) => makeDocument(type, "verified"));
}

describe("getRequirementStatus", () => {
  it("returns 'missing' when there are no documents", () => {
    expect(getRequirementStatus("passport", [])).toBe("missing");
  });

  it("returns 'missing' when no document matches the type", () => {
    const docs = [makeDocument("transcript", "verified")];
    expect(getRequirementStatus("passport", docs)).toBe("missing");
  });

  it("returns 'verifying' for a single verifying document", () => {
    const docs = [makeDocument("passport", "verifying")];
    expect(getRequirementStatus("passport", docs)).toBe("verifying");
  });

  it("returns 'rejected' for a single rejected document", () => {
    const docs = [makeDocument("passport", "rejected")];
    expect(getRequirementStatus("passport", docs)).toBe("rejected");
  });

  it("returns 'verified' for a single verified document", () => {
    const docs = [makeDocument("passport", "verified")];
    expect(getRequirementStatus("passport", docs)).toBe("verified");
  });

  it("returns 'verified' when there are both rejected and verified documents of the same type", () => {
    const docs = [
      makeDocument("passport", "rejected"),
      makeDocument("passport", "verified"),
    ];
    expect(getRequirementStatus("passport", docs)).toBe("verified");
  });

  it("returns 'verifying' when there are both rejected and verifying documents of the same type", () => {
    const docs = [
      makeDocument("passport", "rejected"),
      makeDocument("passport", "verifying"),
    ];
    expect(getRequirementStatus("passport", docs)).toBe("verifying");
  });

  it("returns 'verifying' when verified-for-different-type and verifying for the queried type", () => {
    const docs = [
      makeDocument("transcript", "verified"),
      makeDocument("passport", "verifying"),
    ];
    expect(getRequirementStatus("passport", docs)).toBe("verifying");
  });

  it("ignores documents of a different type", () => {
    const docs = [makeDocument("transcript", "verified")];
    expect(getRequirementStatus("passport", docs)).toBe("missing");
  });
});

describe("evaluateAlertRules", () => {
  it("produces a warning alert for each missing document when all are missing", () => {
    const { alerts, requirementStatuses } = evaluateAlertRules([]);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe("warning");
    expect(alerts[0].dedupeKey).toBe("missing-documents");
    expect(alerts[0].message).toContain("Missing");

    for (const type of requiredDocumentTypes) {
      expect(requirementStatuses[type]).toBe("missing");
    }
  });

  it("produces no alerts when all documents are verified", () => {
    const { alerts } = evaluateAlertRules(makeAllVerified());
    expect(alerts).toHaveLength(0);
  });

  it("produces a critical alert for a rejected document", () => {
    const docs = [
      ...makeAllVerified().filter((d) => d.documentType !== "passport"),
      makeDocument("passport", "rejected"),
    ];

    const { alerts } = evaluateAlertRules(docs);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe("critical");
    expect(alerts[0].dedupeKey).toBe("rejected-documents");
    expect(alerts[0].message).toContain("Replace rejected");
  });

  it("produces an info alert for a verifying document", () => {
    const docs = [
      ...makeAllVerified().filter((d) => d.documentType !== "transcript"),
      makeDocument("transcript", "verifying"),
    ];

    const { alerts } = evaluateAlertRules(docs);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe("info");
    expect(alerts[0].dedupeKey).toBe("verification-running");
    expect(alerts[0].message).toContain("Verification running");
  });

  it("produces all three alert types simultaneously", () => {
    const docs = [
      makeDocument("passport", "verified"),
      makeDocument("transcript", "rejected"),
      makeDocument("bankStatement", "verifying"),
      // statementOfPurpose, resume, englishTest are missing
    ];

    const { alerts } = evaluateAlertRules(docs);

    expect(alerts).toHaveLength(3);
    const severities = alerts.map((a) => a.severity);
    expect(severities).toContain("warning");
    expect(severities).toContain("critical");
    expect(severities).toContain("info");
  });

  it("lists the document label in the missing-documents alert message", () => {
    const docs = makeAllVerified().filter((d) => d.documentType !== "passport");
    const { alerts } = evaluateAlertRules(docs);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].message).toContain("Passport");
  });

  it("lists the document label in the rejected-documents alert message", () => {
    const docs = [
      ...makeAllVerified().filter((d) => d.documentType !== "resume"),
      makeDocument("resume", "rejected"),
    ];

    const { alerts } = evaluateAlertRules(docs);
    const criticalAlert = alerts.find((a) => a.severity === "critical");

    expect(criticalAlert).toBeDefined();
    expect(criticalAlert!.message).toContain("Resume");
  });

  it("correctly records requirementStatuses for all types", () => {
    const docs = [
      makeDocument("passport", "verified"),
      makeDocument("transcript", "verifying"),
      makeDocument("bankStatement", "rejected"),
    ];

    const { requirementStatuses } = evaluateAlertRules(docs);

    expect(requirementStatuses.passport).toBe("verified");
    expect(requirementStatuses.transcript).toBe("verifying");
    expect(requirementStatuses.bankStatement).toBe("rejected");
    expect(requirementStatuses.statementOfPurpose).toBe("missing");
    expect(requirementStatuses.resume).toBe("missing");
    expect(requirementStatuses.englishTest).toBe("missing");
  });

  it("does not create a missing-documents alert when all remaining types are verifying or verified", () => {
    const docs = requiredDocumentTypes.map((type) =>
      makeDocument(type, type === "passport" ? "verifying" : "verified")
    );

    const { alerts } = evaluateAlertRules(docs);

    const missingAlert = alerts.find((a) => a.dedupeKey === "missing-documents");
    expect(missingAlert).toBeUndefined();
  });

  it("counts a verifying document as not missing", () => {
    const docs = requiredDocumentTypes.map((type) =>
      makeDocument(type, "verifying")
    );

    const { requirementStatuses } = evaluateAlertRules(docs);

    for (const type of requiredDocumentTypes) {
      expect(requirementStatuses[type]).toBe("verifying");
    }
  });
});
