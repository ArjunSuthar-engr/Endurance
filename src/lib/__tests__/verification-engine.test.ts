import { describe, it, expect } from "vitest";
import { runAuthenticityVerification } from "@/lib/verification-engine";
import { MIN_FILE_SIZE_BYTES, MAX_FILE_SIZE_BYTES } from "@/lib/document-policy";
import type { VerificationInput } from "@/lib/verification-engine";
import type { DocumentType } from "@/lib/student-application-schema";

// ─── byte helpers ───────────────────────────────────────────────────────────

const VALID_SIZE = MIN_FILE_SIZE_BYTES + 1024; // just above the 20 KB floor

function makePdfBytes(size = VALID_SIZE): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes.set([0x25, 0x50, 0x44, 0x46]); // %PDF
  return bytes;
}

function makePngBytes(size = VALID_SIZE): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes.set([0x89, 0x50, 0x4e, 0x47]); // PNG signature
  return bytes;
}

function makeJpgBytes(size = VALID_SIZE): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes.set([0xff, 0xd8, 0xff]); // JPEG SOI marker
  return bytes;
}

function makeUnknownBytes(size = VALID_SIZE): Uint8Array {
  return new Uint8Array(size).fill(0x00);
}

// ─── base input builder ──────────────────────────────────────────────────────

let _checksumCounter = 0;

function baseInput(overrides: Partial<VerificationInput> = {}): VerificationInput {
  _checksumCounter += 1;
  return {
    documentType: "passport",
    fileName: "passport.pdf",
    fileSize: VALID_SIZE,
    mimeType: "application/pdf",
    checksum: `cs-${_checksumCounter}`,
    bytes: makePdfBytes(),
    existingChecksums: new Set<string>(),
    ...overrides,
  };
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function checkByCode(result: ReturnType<typeof runAuthenticityVerification>, code: string) {
  return result.checks.find((c) => c.code === code);
}

// ─── happy-path ──────────────────────────────────────────────────────────────

describe("runAuthenticityVerification – happy path", () => {
  it("returns status 'verified' and score 100 for a perfectly valid passport PDF", () => {
    const result = runAuthenticityVerification(baseInput());
    expect(result.status).toBe("verified");
    expect(result.authenticityScore).toBe(100);
    expect(result.rejectionReason).toBeUndefined();
  });

  it("all checks are 'pass' for a valid document", () => {
    const result = runAuthenticityVerification(baseInput());
    for (const check of result.checks) {
      expect(check.status).toBe("pass");
    }
  });

  it("verifies a valid PNG passport", () => {
    const result = runAuthenticityVerification(
      baseInput({
        fileName: "passport.png",
        mimeType: "image/png",
        bytes: makePngBytes(),
      })
    );
    expect(result.status).toBe("verified");
  });

  it("verifies a valid JPEG transcript", () => {
    const result = runAuthenticityVerification(
      baseInput({
        documentType: "transcript",
        fileName: "transcript.jpg",
        mimeType: "image/jpeg",
        bytes: makeJpgBytes(),
      })
    );
    expect(result.status).toBe("verified");
  });

  it("verifies a valid PDF statement of purpose", () => {
    const result = runAuthenticityVerification(
      baseInput({
        documentType: "statementOfPurpose",
        fileName: "statement-of-purpose.pdf",
        mimeType: "application/pdf",
        bytes: makePdfBytes(),
      })
    );
    expect(result.status).toBe("verified");
  });

  it("verifies a valid PDF resume named 'resume-cv.pdf'", () => {
    const result = runAuthenticityVerification(
      baseInput({
        documentType: "resume",
        fileName: "resume-cv.pdf",
        mimeType: "application/pdf",
        bytes: makePdfBytes(),
      })
    );
    expect(result.status).toBe("verified");
  });
});

// ─── extension check ─────────────────────────────────────────────────────────

describe("runAuthenticityVerification – extension policy", () => {
  it("fails and rejects for a .txt extension on a passport", () => {
    const result = runAuthenticityVerification(
      baseInput({ fileName: "passport.txt" })
    );

    expect(result.status).toBe("rejected");
    expect(checkByCode(result, "extension")?.status).toBe("fail");
  });

  it("fails for a .jpg extension on a statementOfPurpose (PDF only)", () => {
    const result = runAuthenticityVerification(
      baseInput({
        documentType: "statementOfPurpose",
        fileName: "sop.jpg",
        mimeType: "image/jpeg",
        bytes: makeJpgBytes(),
      })
    );

    expect(result.status).toBe("rejected");
    expect(checkByCode(result, "extension")?.status).toBe("fail");
  });

  it("fails for a .jpg extension on a resume (PDF only)", () => {
    const result = runAuthenticityVerification(
      baseInput({
        documentType: "resume",
        fileName: "resume.jpg",
        mimeType: "image/jpeg",
        bytes: makeJpgBytes(),
      })
    );

    expect(result.status).toBe("rejected");
    expect(checkByCode(result, "extension")?.status).toBe("fail");
  });

  it("passes for .jpeg extension on a transcript (allowed)", () => {
    const result = runAuthenticityVerification(
      baseInput({
        documentType: "transcript",
        fileName: "transcript.jpeg",
        mimeType: "image/jpeg",
        bytes: makeJpgBytes(),
      })
    );

    expect(checkByCode(result, "extension")?.status).toBe("pass");
  });
});

// ─── MIME type check ──────────────────────────────────────────────────────────

describe("runAuthenticityVerification – MIME type policy", () => {
  it("warns for generic application/octet-stream MIME type", () => {
    const result = runAuthenticityVerification(
      baseInput({ mimeType: "application/octet-stream" })
    );

    expect(checkByCode(result, "mime-type")?.status).toBe("warn");
  });

  it("warns for empty MIME type", () => {
    const result = runAuthenticityVerification(baseInput({ mimeType: "" }));
    expect(checkByCode(result, "mime-type")?.status).toBe("warn");
  });

  it("fails for a MIME type that is not in the policy list", () => {
    const result = runAuthenticityVerification(
      baseInput({ mimeType: "text/html" })
    );

    expect(result.status).toBe("rejected");
    expect(checkByCode(result, "mime-type")?.status).toBe("fail");
  });

  it("fails for image/jpeg MIME on a statementOfPurpose", () => {
    const result = runAuthenticityVerification(
      baseInput({
        documentType: "statementOfPurpose",
        fileName: "sop.pdf",
        mimeType: "image/jpeg",
        bytes: makePdfBytes(),
      })
    );

    expect(checkByCode(result, "mime-type")?.status).toBe("fail");
  });
});

// ─── file size check ──────────────────────────────────────────────────────────

describe("runAuthenticityVerification – file size bounds", () => {
  it("fails when the file exceeds the maximum allowed size", () => {
    const result = runAuthenticityVerification(
      baseInput({
        fileSize: MAX_FILE_SIZE_BYTES + 1,
        bytes: makePdfBytes(MAX_FILE_SIZE_BYTES + 1),
      })
    );

    expect(result.status).toBe("rejected");
    expect(checkByCode(result, "size")?.status).toBe("fail");
  });

  it("warns when the file is unusually small (below min threshold)", () => {
    const result = runAuthenticityVerification(
      baseInput({
        fileSize: MIN_FILE_SIZE_BYTES - 1,
        bytes: makePdfBytes(MIN_FILE_SIZE_BYTES - 1),
      })
    );

    expect(checkByCode(result, "size")?.status).toBe("warn");
  });

  it("passes for a file exactly at the minimum size", () => {
    const result = runAuthenticityVerification(
      baseInput({
        fileSize: MIN_FILE_SIZE_BYTES,
        bytes: makePdfBytes(MIN_FILE_SIZE_BYTES),
      })
    );

    expect(checkByCode(result, "size")?.status).toBe("pass");
  });

  it("passes for a file exactly at the maximum size", () => {
    const result = runAuthenticityVerification(
      baseInput({
        fileSize: MAX_FILE_SIZE_BYTES,
        bytes: makePdfBytes(MAX_FILE_SIZE_BYTES),
      })
    );

    expect(checkByCode(result, "size")?.status).toBe("pass");
  });
});

// ─── binary signature check ───────────────────────────────────────────────────

describe("runAuthenticityVerification – binary signature integrity", () => {
  it("fails when PNG bytes are supplied for a .pdf file", () => {
    const result = runAuthenticityVerification(
      baseInput({ bytes: makePngBytes() })
    );

    expect(result.status).toBe("rejected");
    expect(checkByCode(result, "signature")?.status).toBe("fail");
  });

  it("fails when JPEG bytes are supplied for a .pdf file", () => {
    const result = runAuthenticityVerification(
      baseInput({ bytes: makeJpgBytes() })
    );

    expect(result.status).toBe("rejected");
    expect(checkByCode(result, "signature")?.status).toBe("fail");
  });

  it("fails when bytes with unknown signature are supplied for a .pdf file", () => {
    const result = runAuthenticityVerification(
      baseInput({ bytes: makeUnknownBytes() })
    );

    expect(checkByCode(result, "signature")?.status).toBe("fail");
  });

  it("fails when PDF bytes are supplied for a .png file", () => {
    const result = runAuthenticityVerification(
      baseInput({
        fileName: "passport.png",
        mimeType: "image/png",
        bytes: makePdfBytes(),
      })
    );

    expect(checkByCode(result, "signature")?.status).toBe("fail");
  });

  it("passes when PNG bytes match a .png extension", () => {
    const result = runAuthenticityVerification(
      baseInput({
        fileName: "passport.png",
        mimeType: "image/png",
        bytes: makePngBytes(),
      })
    );

    expect(checkByCode(result, "signature")?.status).toBe("pass");
  });

  it("passes when JPEG bytes match a .jpg extension", () => {
    const result = runAuthenticityVerification(
      baseInput({
        fileName: "passport.jpg",
        mimeType: "image/jpeg",
        bytes: makeJpgBytes(),
      })
    );

    expect(checkByCode(result, "signature")?.status).toBe("pass");
  });

  it("passes when JPEG bytes match a .jpeg extension", () => {
    const result = runAuthenticityVerification(
      baseInput({
        documentType: "transcript",
        fileName: "transcript.jpeg",
        mimeType: "image/jpeg",
        bytes: makeJpgBytes(),
      })
    );

    expect(checkByCode(result, "signature")?.status).toBe("pass");
  });
});

// ─── duplicate detection ──────────────────────────────────────────────────────

describe("runAuthenticityVerification – duplicate detection", () => {
  it("fails when the checksum is already in existingChecksums", () => {
    const checksum = "dup-checksum-abc";
    const result = runAuthenticityVerification(
      baseInput({
        checksum,
        existingChecksums: new Set([checksum]),
      })
    );

    expect(result.status).toBe("rejected");
    expect(checkByCode(result, "duplicate")?.status).toBe("fail");
  });

  it("passes when the checksum is not in existingChecksums", () => {
    const result = runAuthenticityVerification(
      baseInput({
        checksum: "unique-checksum",
        existingChecksums: new Set(["other-checksum"]),
      })
    );

    expect(checkByCode(result, "duplicate")?.status).toBe("pass");
  });
});

// ─── filename hygiene check ───────────────────────────────────────────────────

describe("runAuthenticityVerification – filename hygiene signal", () => {
  it.each([
    "passport-edited.pdf",
    "passport-copy.pdf",
    "passport-final.pdf",
    "passport_v2.pdf",
    "scan-passport.pdf",
    "passport-mobile.pdf",
    "screenshot-passport.pdf",
  ])("warns for risky filename keyword in '%s'", (fileName) => {
    const result = runAuthenticityVerification(baseInput({ fileName }));
    expect(checkByCode(result, "filename-risk")?.status).toBe("warn");
  });

  it("passes for a clean filename", () => {
    const result = runAuthenticityVerification(
      baseInput({ fileName: "passport.pdf" })
    );
    expect(checkByCode(result, "filename-risk")?.status).toBe("pass");
  });
});

// ─── declared document intent check ──────────────────────────────────────────

describe("runAuthenticityVerification – declared document intent", () => {
  it("warns when filename does not contain a signal for the document type", () => {
    const result = runAuthenticityVerification(
      baseInput({ fileName: "document.pdf" })
    );
    expect(checkByCode(result, "document-intent")?.status).toBe("warn");
  });

  it("passes when filename contains 'passport' for documentType passport", () => {
    const result = runAuthenticityVerification(
      baseInput({ fileName: "my-passport.pdf" })
    );
    expect(checkByCode(result, "document-intent")?.status).toBe("pass");
  });

  it("passes when filename contains 'transcript' for documentType transcript", () => {
    const result = runAuthenticityVerification(
      baseInput({
        documentType: "transcript",
        fileName: "academic-transcript.pdf",
        mimeType: "application/pdf",
        bytes: makePdfBytes(),
      })
    );
    expect(checkByCode(result, "document-intent")?.status).toBe("pass");
  });

  it("passes when filename contains 'cv' for documentType resume", () => {
    const result = runAuthenticityVerification(
      baseInput({
        documentType: "resume",
        fileName: "john-cv.pdf",
        mimeType: "application/pdf",
        bytes: makePdfBytes(),
      })
    );
    expect(checkByCode(result, "document-intent")?.status).toBe("pass");
  });

  it.each([
    ["bankStatement", "bank-statement-2024.pdf"],
    ["statementOfPurpose", "sop-admission.pdf"],
    ["englishTest", "ielts-results.pdf"],
  ] as [DocumentType, string][])(
    "passes document-intent check for %s with filename '%s'",
    (documentType, fileName) => {
      const result = runAuthenticityVerification(
        baseInput({ documentType, fileName, bytes: makePdfBytes() })
      );
      expect(checkByCode(result, "document-intent")?.status).toBe("pass");
    }
  );
});

// ─── scoring and rejection reason ────────────────────────────────────────────

describe("runAuthenticityVerification – authenticity scoring", () => {
  it("reduces score by 10 for each 'warn' check", () => {
    // Trigger size warn (small) only; everything else passes
    const result = runAuthenticityVerification(
      baseInput({
        fileSize: MIN_FILE_SIZE_BYTES - 1,
        bytes: makePdfBytes(MIN_FILE_SIZE_BYTES - 1),
      })
    );

    expect(result.authenticityScore).toBe(90);
  });

  it("reduces score by 35 for each 'fail' check", () => {
    // Trigger only the MIME fail
    const result = runAuthenticityVerification(
      baseInput({ mimeType: "text/html" })
    );

    const failCount = result.checks.filter((c) => c.status === "fail").length;
    const warnCount = result.checks.filter((c) => c.status === "warn").length;
    const expected = Math.max(0, 100 - failCount * 35 - warnCount * 10);
    expect(result.authenticityScore).toBe(expected);
  });

  it("clamps authenticity score to 0 when multiple failures accumulate", () => {
    // Trigger extension fail + MIME fail + signature fail + duplicate fail
    const checksum = "score-clamp-test";
    const result = runAuthenticityVerification(
      baseInput({
        fileName: "passport.txt",
        mimeType: "text/plain",
        checksum,
        existingChecksums: new Set([checksum]),
      })
    );

    expect(result.authenticityScore).toBe(0);
  });

  it("sets a rejectionReason when the document is rejected with fixes", () => {
    const result = runAuthenticityVerification(
      baseInput({ mimeType: "text/html" })
    );

    expect(result.status).toBe("rejected");
    expect(result.rejectionReason).toBeDefined();
    expect(typeof result.rejectionReason).toBe("string");
    expect(result.rejectionReason!.length).toBeGreaterThan(0);
  });

  it("rejects when there are no hard failures but score is below 70 due to multiple warns", () => {
    // Four warnings: size (small) + MIME (octet-stream) + filename-risk + document-intent
    // 100 - 4*10 = 60 < 70 → rejected
    const result = runAuthenticityVerification(
      baseInput({
        fileName: "file-edited.pdf",   // filename-risk warn + document-intent warn
        mimeType: "application/octet-stream", // mime warn
        fileSize: MIN_FILE_SIZE_BYTES - 1,    // size warn
        bytes: makePdfBytes(MIN_FILE_SIZE_BYTES - 1),
      })
    );

    expect(result.status).toBe("rejected");
    expect(result.authenticityScore).toBeLessThan(70);
    const hasHardFailure = result.checks.some((c) => c.status === "fail");
    expect(hasHardFailure).toBe(false);
  });

  it("includes rejectionReason mentioning score threshold when no fixes are available", () => {
    // Four warns → score 60 → no hard failures → rejectionReason about threshold
    const result = runAuthenticityVerification(
      baseInput({
        fileName: "file-edited.pdf",
        mimeType: "application/octet-stream",
        fileSize: MIN_FILE_SIZE_BYTES - 1,
        bytes: makePdfBytes(MIN_FILE_SIZE_BYTES - 1),
      })
    );

    expect(result.status).toBe("rejected");
    expect(result.rejectionReason).toBeDefined();
  });
});

// ─── output structure ─────────────────────────────────────────────────────────

describe("runAuthenticityVerification – output structure", () => {
  it("always returns exactly 7 checks", () => {
    const result = runAuthenticityVerification(baseInput());
    expect(result.checks).toHaveLength(7);
  });

  it("every check has code, label, status and detail fields", () => {
    const result = runAuthenticityVerification(baseInput());
    for (const check of result.checks) {
      expect(typeof check.code).toBe("string");
      expect(typeof check.label).toBe("string");
      expect(["pass", "warn", "fail"]).toContain(check.status);
      expect(typeof check.detail).toBe("string");
    }
  });

  it("includes all expected check codes", () => {
    const result = runAuthenticityVerification(baseInput());
    const codes = result.checks.map((c) => c.code);
    expect(codes).toContain("extension");
    expect(codes).toContain("mime-type");
    expect(codes).toContain("size");
    expect(codes).toContain("signature");
    expect(codes).toContain("duplicate");
    expect(codes).toContain("filename-risk");
    expect(codes).toContain("document-intent");
  });
});
