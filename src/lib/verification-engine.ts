import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  MIN_FILE_SIZE_BYTES,
  getFileExtension,
} from "@/lib/document-policy";
import { documentTypeLabels, type DocumentType, type VerificationCheck } from "@/lib/student-application-schema";

const MIN_SCORE_TO_VERIFY = 70;

const filenameSignals: Record<DocumentType, string[]> = {
  passport: ["passport"],
  transcript: ["transcript", "marksheet", "academic"],
  bankStatement: ["bank", "statement", "balance"],
  statementOfPurpose: ["sop", "statement", "purpose"],
  resume: ["resume", "cv"],
  englishTest: ["ielts", "toefl", "pte", "duolingo", "english"],
};

const magicSignatures = {
  pdf: [0x25, 0x50, 0x44, 0x46],
  png: [0x89, 0x50, 0x4e, 0x47],
  jpg: [0xff, 0xd8, 0xff],
};

type VerificationStatus = "verified" | "rejected";

export type VerificationResult = {
  status: VerificationStatus;
  authenticityScore: number;
  checks: VerificationCheck[];
  rejectionReason?: string;
};

export type VerificationInput = {
  fileName: string;
  fileSize: number;
  mimeType: string;
  checksum: string;
  documentType: DocumentType;
  bytes: Uint8Array;
  existingChecksums: Set<string>;
};

function hasSignature(bytes: Uint8Array, signature: number[]) {
  if (bytes.length < signature.length) {
    return false;
  }

  return signature.every((value, index) => bytes[index] === value);
}

function detectFileSignature(bytes: Uint8Array): "pdf" | "png" | "jpg" | "unknown" {
  if (hasSignature(bytes, magicSignatures.pdf)) {
    return "pdf";
  }

  if (hasSignature(bytes, magicSignatures.png)) {
    return "png";
  }

  if (hasSignature(bytes, magicSignatures.jpg)) {
    return "jpg";
  }

  return "unknown";
}

function expectedSignaturesByExtension(extension: string): Array<"pdf" | "png" | "jpg"> {
  if (extension === ".pdf") {
    return ["pdf"];
  }

  if (extension === ".png") {
    return ["png"];
  }

  if (extension === ".jpg" || extension === ".jpeg") {
    return ["jpg"];
  }

  return [];
}

export function runAuthenticityVerification(args: VerificationInput): VerificationResult {
  const checks: VerificationCheck[] = [];
  const extension = getFileExtension(args.fileName);
  const mimeTypes = ALLOWED_MIME_TYPES[args.documentType];
  const extensions = ALLOWED_EXTENSIONS[args.documentType];
  const detectedSignature = detectFileSignature(args.bytes);
  const expectedSignatures = expectedSignaturesByExtension(extension);
  const signatureMatches =
    detectedSignature !== "unknown" && expectedSignatures.includes(detectedSignature);
  const filenameRisky = /(edited|copy|final|v\d+|scan|mobile|screenshot)/i.test(args.fileName);
  const normalizedName = args.fileName.toLowerCase();

  if (!extensions.includes(extension)) {
    checks.push({
      code: "extension",
      label: "File extension policy",
      status: "fail",
      detail: `Extension ${extension || "(missing)"} not allowed for ${documentTypeLabels[args.documentType]}.`,
    });
  } else {
    checks.push({
      code: "extension",
      label: "File extension policy",
      status: "pass",
      detail: `Extension ${extension} accepted.`,
    });
  }

  if (!args.mimeType || args.mimeType === "application/octet-stream") {
    checks.push({
      code: "mime-type",
      label: "MIME type policy",
      status: "warn",
      detail: "Browser supplied a generic MIME type. Signature checks are used as fallback.",
    });
  } else if (!mimeTypes.includes(args.mimeType)) {
    checks.push({
      code: "mime-type",
      label: "MIME type policy",
      status: "fail",
      detail: `MIME ${args.mimeType} is not permitted for ${documentTypeLabels[args.documentType]}.`,
    });
  } else {
    checks.push({
      code: "mime-type",
      label: "MIME type policy",
      status: "pass",
      detail: `MIME ${args.mimeType} accepted.`,
    });
  }

  if (args.fileSize > MAX_FILE_SIZE_BYTES) {
    checks.push({
      code: "size",
      label: "File size bounds",
      status: "fail",
      detail: `File exceeds ${MAX_FILE_SIZE_BYTES} byte limit.`,
    });
  } else if (args.fileSize < MIN_FILE_SIZE_BYTES) {
    checks.push({
      code: "size",
      label: "File size bounds",
      status: "warn",
      detail: "File is unusually small and may be incomplete.",
    });
  } else {
    checks.push({
      code: "size",
      label: "File size bounds",
      status: "pass",
      detail: "File size falls within expected range.",
    });
  }

  if (expectedSignatures.length === 0 || !signatureMatches) {
    checks.push({
      code: "signature",
      label: "Binary signature integrity",
      status: "fail",
      detail: `Detected signature ${detectedSignature} does not match ${extension || "file type"}.`,
    });
  } else {
    checks.push({
      code: "signature",
      label: "Binary signature integrity",
      status: "pass",
      detail: `Signature check matched ${detectedSignature}.`,
    });
  }

  if (args.existingChecksums.has(args.checksum)) {
    checks.push({
      code: "duplicate",
      label: "Duplicate detection",
      status: "fail",
      detail: "Identical file already uploaded in this application.",
    });
  } else {
    checks.push({
      code: "duplicate",
      label: "Duplicate detection",
      status: "pass",
      detail: "No duplicate content hash found.",
    });
  }

  if (filenameRisky) {
    checks.push({
      code: "filename-risk",
      label: "Filename hygiene signal",
      status: "warn",
      detail: "Filename pattern suggests potential manual edits. Review recommended.",
    });
  } else {
    checks.push({
      code: "filename-risk",
      label: "Filename hygiene signal",
      status: "pass",
      detail: "Filename does not indicate risky edit markers.",
    });
  }

  const semanticMatch = filenameSignals[args.documentType].some((signal) => normalizedName.includes(signal));
  checks.push({
    code: "document-intent",
    label: "Declared document intent",
    status: semanticMatch ? "pass" : "warn",
    detail: semanticMatch
      ? "Filename matches the declared document type."
      : "Filename does not clearly indicate the declared document type.",
  });

  let authenticityScore = 100;
  for (const check of checks) {
    if (check.status === "warn") {
      authenticityScore -= 10;
    } else if (check.status === "fail") {
      authenticityScore -= 35;
    }
  }
  authenticityScore = Math.max(0, authenticityScore);

  const hasHardFailure = checks.some((check) => check.status === "fail");
  const verified = !hasHardFailure && authenticityScore >= MIN_SCORE_TO_VERIFY;

  if (verified) {
    return {
      status: "verified",
      authenticityScore,
      checks,
    };
  }

  const failingChecks = checks
    .filter((check) => check.status === "fail")
    .map((check) => check.label)
    .slice(0, 2)
    .join(", ");

  return {
    status: "rejected",
    authenticityScore,
    checks,
    rejectionReason:
      failingChecks.length > 0
        ? `Automated validation failed: ${failingChecks}.`
        : "Authenticity score below required threshold.",
  };
}
