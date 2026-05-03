import { describe, it, expect } from "vitest";
import {
  isDocumentType,
  documentTypeLabels,
  requiredDocumentTypes,
} from "@/lib/student-application-schema";

describe("isDocumentType", () => {
  it.each([
    "passport",
    "transcript",
    "bankStatement",
    "statementOfPurpose",
    "resume",
    "englishTest",
  ])("returns true for valid type %s", (type) => {
    expect(isDocumentType(type)).toBe(true);
  });

  it.each(["foo", "", "id", "PASSPORT", "bank_statement", "cv"])(
    "returns false for invalid type %s",
    (type) => {
      expect(isDocumentType(type)).toBe(false);
    }
  );
});

describe("documentTypeLabels", () => {
  it("has a label for every required document type", () => {
    for (const type of requiredDocumentTypes) {
      expect(documentTypeLabels[type]).toBeTruthy();
    }
  });

  it("maps passport to a human-readable label", () => {
    expect(documentTypeLabels.passport).toBe("Passport");
  });

  it("maps bankStatement to a human-readable label", () => {
    expect(documentTypeLabels.bankStatement).toBe("Bank Statement");
  });
});

describe("requiredDocumentTypes", () => {
  it("contains exactly 6 document types", () => {
    expect(requiredDocumentTypes).toHaveLength(6);
  });

  it("contains all expected types", () => {
    expect(requiredDocumentTypes).toContain("passport");
    expect(requiredDocumentTypes).toContain("transcript");
    expect(requiredDocumentTypes).toContain("bankStatement");
    expect(requiredDocumentTypes).toContain("statementOfPurpose");
    expect(requiredDocumentTypes).toContain("resume");
    expect(requiredDocumentTypes).toContain("englishTest");
  });
});
