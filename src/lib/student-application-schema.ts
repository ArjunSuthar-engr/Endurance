export const documentTypeLabels = {
  passport: "Passport",
  transcript: "Academic Transcript",
  bankStatement: "Bank Statement",
  statementOfPurpose: "Statement of Purpose",
  resume: "Resume / CV",
  englishTest: "English Test Score",
} as const;

export type DocumentType = keyof typeof documentTypeLabels;

export const requiredDocumentTypes: DocumentType[] = [
  "passport",
  "transcript",
  "bankStatement",
  "statementOfPurpose",
  "resume",
  "englishTest",
];

export type VerificationStatus = "verifying" | "verified" | "rejected";
export type CheckStatus = "pass" | "warn" | "fail";
export type AlertSeverity = "info" | "warning" | "critical";

export type VerificationCheck = {
  code: string;
  label: string;
  status: CheckStatus;
  detail: string;
};

export type UploadedDocument = {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  checksum: string;
  documentType: DocumentType;
  status: VerificationStatus;
  uploadedAt: string;
  authenticityScore: number;
  rejectionReason?: string;
  checks: VerificationCheck[];
};

export type ApplicationAlert = {
  id: string;
  severity: AlertSeverity;
  message: string;
};

export type ApplicationState = {
  applicationId: string;
  progressPercent: number;
  requiredDocuments: DocumentType[];
  missingDocuments: DocumentType[];
  uploadedDocuments: UploadedDocument[];
  alerts: ApplicationAlert[];
  updatedAt: string;
};

export function isDocumentType(value: string): value is DocumentType {
  return value in documentTypeLabels;
}
