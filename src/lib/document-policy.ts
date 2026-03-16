import type { DocumentType } from "@/lib/student-application-schema";

export const MIN_FILE_SIZE_BYTES = 20 * 1024;
export const MAX_FILE_SIZE_BYTES = 12 * 1024 * 1024;

export const ALLOWED_MIME_TYPES: Record<DocumentType, string[]> = {
  passport: ["application/pdf", "image/jpeg", "image/png"],
  transcript: ["application/pdf", "image/jpeg", "image/png"],
  bankStatement: ["application/pdf", "image/jpeg", "image/png"],
  statementOfPurpose: ["application/pdf"],
  resume: ["application/pdf"],
  englishTest: ["application/pdf", "image/jpeg", "image/png"],
};

export const ALLOWED_EXTENSIONS: Record<DocumentType, string[]> = {
  passport: [".pdf", ".jpg", ".jpeg", ".png"],
  transcript: [".pdf", ".jpg", ".jpeg", ".png"],
  bankStatement: [".pdf", ".jpg", ".jpeg", ".png"],
  statementOfPurpose: [".pdf"],
  resume: [".pdf"],
  englishTest: [".pdf", ".jpg", ".jpeg", ".png"],
};

export type UploadValidationResult = {
  extension: string;
  isExtensionAllowed: boolean;
  isMimeAllowed: boolean;
  isSizeAllowed: boolean;
  errors: string[];
  warnings: string[];
};

export function getFileExtension(fileName: string) {
  const match = fileName.toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : "";
}

export function validateUploadRequest(input: {
  documentType: DocumentType;
  fileName: string;
  mimeType: string;
  fileSize: number;
}) {
  const extension = getFileExtension(input.fileName);
  const extensionAllowed = ALLOWED_EXTENSIONS[input.documentType].includes(extension);
  const mimeAllowed =
    !!input.mimeType && ALLOWED_MIME_TYPES[input.documentType].includes(input.mimeType);
  const sizeAllowed = input.fileSize > 0 && input.fileSize <= MAX_FILE_SIZE_BYTES;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!extensionAllowed) {
    errors.push(`Extension ${extension || "(missing)"} is not allowed for this document type.`);
  }

  if (!input.mimeType || input.mimeType === "application/octet-stream") {
    warnings.push(`Declared MIME type ${input.mimeType || "missing"} is not a strict policy type.`);
  } else if (!mimeAllowed) {
    errors.push(`Declared MIME type ${input.mimeType} is not in policy list.`);
  }

  if (!sizeAllowed) {
    errors.push(`File size ${input.fileSize} exceeds the ${MAX_FILE_SIZE_BYTES} byte limit.`);
  }

  return {
    extension,
    isExtensionAllowed: extensionAllowed,
    isMimeAllowed: mimeAllowed,
    isSizeAllowed: sizeAllowed,
    errors,
    warnings,
  } as UploadValidationResult;
}
