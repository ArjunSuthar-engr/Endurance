import { describe, it, expect } from "vitest";
import {
  getFileExtension,
  validateUploadRequest,
  MAX_FILE_SIZE_BYTES,
  MIN_FILE_SIZE_BYTES,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
} from "@/lib/document-policy";

describe("getFileExtension", () => {
  it("extracts a lowercase pdf extension", () => {
    expect(getFileExtension("passport.pdf")).toBe(".pdf");
  });

  it("extracts a lowercase jpg extension", () => {
    expect(getFileExtension("photo.jpg")).toBe(".jpg");
  });

  it("normalises uppercase extension to lowercase", () => {
    expect(getFileExtension("IMAGE.PNG")).toBe(".png");
  });

  it("normalises mixed-case extension", () => {
    expect(getFileExtension("document.PDF")).toBe(".pdf");
  });

  it("extracts extension from a name with multiple dots", () => {
    expect(getFileExtension("my.bank.statement.pdf")).toBe(".pdf");
  });

  it("returns empty string when there is no extension", () => {
    expect(getFileExtension("noextension")).toBe("");
  });

  it("returns empty string for an empty string input", () => {
    expect(getFileExtension("")).toBe("");
  });

  it("extracts .jpeg extension correctly", () => {
    expect(getFileExtension("scan.JPEG")).toBe(".jpeg");
  });
});

describe("validateUploadRequest", () => {
  const VALID_SIZE = MIN_FILE_SIZE_BYTES + 1024;

  it("accepts a valid passport PDF", () => {
    const result = validateUploadRequest({
      documentType: "passport",
      fileName: "passport.pdf",
      mimeType: "application/pdf",
      fileSize: VALID_SIZE,
    });

    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.isExtensionAllowed).toBe(true);
    expect(result.isMimeAllowed).toBe(true);
    expect(result.isSizeAllowed).toBe(true);
    expect(result.extension).toBe(".pdf");
  });

  it("accepts a valid transcript JPEG", () => {
    const result = validateUploadRequest({
      documentType: "transcript",
      fileName: "transcript.jpg",
      mimeType: "image/jpeg",
      fileSize: VALID_SIZE,
    });

    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.isExtensionAllowed).toBe(true);
    expect(result.isMimeAllowed).toBe(true);
  });

  it("accepts a valid bank statement PNG", () => {
    const result = validateUploadRequest({
      documentType: "bankStatement",
      fileName: "statement.png",
      mimeType: "image/png",
      fileSize: VALID_SIZE,
    });

    expect(result.errors).toHaveLength(0);
    expect(result.isExtensionAllowed).toBe(true);
    expect(result.isMimeAllowed).toBe(true);
  });

  it("rejects a JPG extension for statementOfPurpose (PDF only)", () => {
    const result = validateUploadRequest({
      documentType: "statementOfPurpose",
      fileName: "sop.jpg",
      mimeType: "image/jpeg",
      fileSize: VALID_SIZE,
    });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.isExtensionAllowed).toBe(false);
    expect(result.isMimeAllowed).toBe(false);
    expect(result.errors.some((e) => e.includes(".jpg"))).toBe(true);
  });

  it("rejects a JPG extension for resume (PDF only)", () => {
    const result = validateUploadRequest({
      documentType: "resume",
      fileName: "resume.jpg",
      mimeType: "image/jpeg",
      fileSize: VALID_SIZE,
    });

    expect(result.isExtensionAllowed).toBe(false);
    expect(result.isMimeAllowed).toBe(false);
  });

  it("adds a warning for missing MIME type", () => {
    const result = validateUploadRequest({
      documentType: "passport",
      fileName: "passport.pdf",
      mimeType: "",
      fileSize: VALID_SIZE,
    });

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.isMimeAllowed).toBe(false);
    expect(result.errors).toHaveLength(0);
  });

  it("adds a warning for generic application/octet-stream MIME type", () => {
    const result = validateUploadRequest({
      documentType: "passport",
      fileName: "passport.pdf",
      mimeType: "application/octet-stream",
      fileSize: VALID_SIZE,
    });

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects an unsupported MIME type for passport", () => {
    const result = validateUploadRequest({
      documentType: "passport",
      fileName: "passport.pdf",
      mimeType: "text/html",
      fileSize: VALID_SIZE,
    });

    expect(result.isMimeAllowed).toBe(false);
    expect(result.errors.some((e) => e.includes("text/html"))).toBe(true);
  });

  it("rejects file size exceeding the maximum", () => {
    const result = validateUploadRequest({
      documentType: "passport",
      fileName: "passport.pdf",
      mimeType: "application/pdf",
      fileSize: MAX_FILE_SIZE_BYTES + 1,
    });

    expect(result.isSizeAllowed).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes("size"))).toBe(true);
  });

  it("rejects zero file size", () => {
    const result = validateUploadRequest({
      documentType: "passport",
      fileName: "passport.pdf",
      mimeType: "application/pdf",
      fileSize: 0,
    });

    expect(result.isSizeAllowed).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("accumulates multiple errors for extension and MIME violations", () => {
    const result = validateUploadRequest({
      documentType: "statementOfPurpose",
      fileName: "sop.txt",
      mimeType: "text/plain",
      fileSize: VALID_SIZE,
    });

    expect(result.errors.length).toBeGreaterThanOrEqual(2);
    expect(result.isExtensionAllowed).toBe(false);
    expect(result.isMimeAllowed).toBe(false);
  });

  it("returns the parsed extension in the result", () => {
    const result = validateUploadRequest({
      documentType: "passport",
      fileName: "scan.JPEG",
      mimeType: "image/jpeg",
      fileSize: VALID_SIZE,
    });

    expect(result.extension).toBe(".jpeg");
  });

  it("correctly identifies all allowed extensions for englishTest", () => {
    for (const ext of ALLOWED_EXTENSIONS.englishTest) {
      const mimeType = ext === ".pdf" ? "application/pdf" : ext === ".png" ? "image/png" : "image/jpeg";
      const result = validateUploadRequest({
        documentType: "englishTest",
        fileName: `score${ext}`,
        mimeType,
        fileSize: VALID_SIZE,
      });

      expect(result.isExtensionAllowed).toBe(true);
    }
  });

  it("confirms ALLOWED_EXTENSIONS and ALLOWED_MIME_TYPES constants are populated", () => {
    const documentTypes = [
      "passport",
      "transcript",
      "bankStatement",
      "statementOfPurpose",
      "resume",
      "englishTest",
    ] as const;

    for (const type of documentTypes) {
      expect(ALLOWED_EXTENSIONS[type].length).toBeGreaterThan(0);
      expect(ALLOWED_MIME_TYPES[type].length).toBeGreaterThan(0);
    }
  });
});
