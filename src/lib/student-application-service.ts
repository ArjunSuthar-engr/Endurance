import "server-only";

import { createHash, randomUUID } from "node:crypto";
import {
  documentTypeLabels,
  requiredDocumentTypes,
  type ApplicationAlert,
  type ApplicationState,
  type DocumentType,
  type UploadedDocument,
  type VerificationCheck,
} from "@/lib/student-application-schema";

type VerificationResult = {
  status: "verified" | "rejected";
  authenticityScore: number;
  checks: VerificationCheck[];
  rejectionReason?: string;
};

type AppStore = {
  documents: UploadedDocument[];
  updatedAt: number;
};

const store: AppStore = {
  documents: [],
  updatedAt: Date.now(),
};

const MIN_FILE_SIZE_BYTES = 20 * 1024;
const MAX_FILE_SIZE_BYTES = 12 * 1024 * 1024;
const MIN_SCORE_TO_VERIFY = 70;

const allowedMimeTypes: Record<DocumentType, string[]> = {
  passport: ["application/pdf", "image/jpeg", "image/png"],
  transcript: ["application/pdf", "image/jpeg", "image/png"],
  bankStatement: ["application/pdf", "image/jpeg", "image/png"],
  statementOfPurpose: ["application/pdf"],
  resume: ["application/pdf"],
  englishTest: ["application/pdf", "image/jpeg", "image/png"],
};

const allowedExtensions: Record<DocumentType, string[]> = {
  passport: [".pdf", ".jpg", ".jpeg", ".png"],
  transcript: [".pdf", ".jpg", ".jpeg", ".png"],
  bankStatement: [".pdf", ".jpg", ".jpeg", ".png"],
  statementOfPurpose: [".pdf"],
  resume: [".pdf"],
  englishTest: [".pdf", ".jpg", ".jpeg", ".png"],
};

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

function getExtension(fileName: string) {
  const match = fileName.toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : "";
}

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

function buildAlerts(state: {
  missingDocuments: DocumentType[];
  documents: UploadedDocument[];
  progressPercent: number;
}): ApplicationAlert[] {
  const alerts: ApplicationAlert[] = [];

  if (state.missingDocuments.length > 0) {
    const missingNames = state.missingDocuments.map((type) => documentTypeLabels[type]);
    alerts.push({
      id: "missing-documents",
      severity: "warning",
      message: `Missing required files: ${missingNames.join(", ")}.`,
    });
  }

  const rejected = state.documents.filter((doc) => doc.status === "rejected");
  if (rejected.length > 0) {
    alerts.push({
      id: "rejected-documents",
      severity: "critical",
      message: `${rejected.length} file(s) rejected by automated authenticity checks.`,
    });
  }

  const verifying = state.documents.filter((doc) => doc.status === "verifying");
  if (verifying.length > 0) {
    alerts.push({
      id: "verification-running",
      severity: "info",
      message: `${verifying.length} file(s) still in verification queue.`,
    });
  }

  if (state.progressPercent === 100) {
    alerts.push({
      id: "ready-for-review",
      severity: "info",
      message: "All mandatory documents verified. Application is ready for review.",
    });
  }

  return alerts;
}

function computeState(): ApplicationState {
  const verifiedByType = new Set<DocumentType>();
  for (const document of store.documents) {
    if (document.status === "verified") {
      verifiedByType.add(document.documentType);
    }
  }

  const missingDocuments = requiredDocumentTypes.filter((type) => !verifiedByType.has(type));
  const progressPercent = Math.round(
    ((requiredDocumentTypes.length - missingDocuments.length) / requiredDocumentTypes.length) * 100
  );

  return {
    applicationId: "APP-STUDENT-0001",
    progressPercent,
    requiredDocuments: requiredDocumentTypes,
    missingDocuments,
    uploadedDocuments: [...store.documents].sort(
      (a, b) => Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt)
    ),
    alerts: buildAlerts({
      missingDocuments,
      documents: store.documents,
      progressPercent,
    }),
    updatedAt: new Date(store.updatedAt).toISOString(),
  };
}

function runAutomatedVerification(args: {
  fileName: string;
  fileSize: number;
  mimeType: string;
  checksum: string;
  documentType: DocumentType;
  bytes: Uint8Array;
  existingChecksums: Set<string>;
}): VerificationResult {
  const checks: VerificationCheck[] = [];
  const extension = getExtension(args.fileName);
  const mimeTypes = allowedMimeTypes[args.documentType];
  const extensions = allowedExtensions[args.documentType];
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
      detail: "File exceeds 12MB limit.",
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

function updateDocumentResult(documentId: string, result: VerificationResult) {
  const index = store.documents.findIndex((document) => document.id === documentId);
  if (index < 0) {
    return;
  }

  const existing = store.documents[index];
  store.documents[index] = {
    ...existing,
    status: result.status,
    authenticityScore: result.authenticityScore,
    rejectionReason: result.rejectionReason,
    checks: result.checks,
  };
  store.updatedAt = Date.now();
}

export async function enqueueUpload(documentType: DocumentType, file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const existingChecksums = new Set(store.documents.map((document) => document.checksum));

  const documentId = randomUUID();
  const pendingRecord: UploadedDocument = {
    id: documentId,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || "application/octet-stream",
    checksum,
    documentType,
    status: "verifying",
    uploadedAt: new Date().toISOString(),
    authenticityScore: 0,
    checks: [],
  };

  store.documents.push(pendingRecord);
  store.updatedAt = Date.now();

  const result = runAutomatedVerification({
    fileName: pendingRecord.fileName,
    fileSize: pendingRecord.fileSize,
    mimeType: pendingRecord.mimeType,
    checksum,
    documentType,
    bytes,
    existingChecksums,
  });

  const randomDelay = 900 + Math.floor(Math.random() * 1400);
  setTimeout(() => {
    updateDocumentResult(documentId, result);
  }, randomDelay);

  return { documentId };
}

export function getApplicationState() {
  return computeState();
}
