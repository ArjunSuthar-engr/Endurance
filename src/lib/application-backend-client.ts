import {
  type ApplicationAlertRecord,
  type ApplicationDocumentRecord,
  type ApplicationEventRecord,
  type ApplicationRecord,
  type DocumentType,
  type UserRecord,
  type VerificationCheck,
  type VerificationCheckRecord,
} from "@/lib/student-application-schema";

type RouteDocumentInput = {
  applicationId: string;
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  checksum: string;
  documentType: DocumentType;
  status: "verifying" | "verified" | "rejected";
  authenticityScore: number;
  rejectionReason?: string;
  uploadedAt: string;
};

type NewEventInput = {
  applicationId: string;
  eventType: ApplicationEventRecord["eventType"];
  payload: Record<string, string>;
};

export type UploadSessionInput = {
  applicationId: string;
  userId: string;
  documentType: DocumentType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  checksum: string;
};

export type UploadAnalysisInput = {
  applicationId: string;
  userId: string;
  documentType: DocumentType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  contentBase64: string;
  existingChecksums: string[];
};

export type UploadAnalysisResponse = {
  checksum: string;
  result: {
    status: "verified" | "rejected";
    authenticityScore: number;
    checks: VerificationCheck[];
    rejectionReason?: string;
  };
};

export type UploadSessionResponse = {
  token: string;
  objectKey: string;
  expiresAt: string;
  document: ApplicationDocumentRecord;
};

const API_BASE = "/api/application";
const HEADERS = { "Content-Type": "application/json" };

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    method: init?.method,
    headers: init?.headers ?? HEADERS,
    body: init?.body,
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Backend request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function buildUrl(path: string, params: Record<string, string> = {}) {
  const query = new URLSearchParams(params);
  if (query.toString()) {
    return `${API_BASE}${path}?${query.toString()}`;
  }

  return `${API_BASE}${path}`;
}

export const DEMO_APPLICATION_ID = "APP-STUDENT-0001";
export const DEMO_USER_ID = "demo-user-student";

export async function getUsersStore(): Promise<{ users: UserRecord[] }> {
  return requestJson<{ users: UserRecord[] }>(buildUrl("", { type: "users" }));
}

export async function ensureApplicationData(userId = DEMO_USER_ID, applicationId = DEMO_APPLICATION_ID) {
  return requestJson<{ user: UserRecord; application: ApplicationRecord }>(API_BASE, {
    method: "POST",
    body: JSON.stringify({
      action: "ensure-application-data",
      userId,
      applicationId,
    }),
  });
}

export async function getApplicationRecord(applicationId: string) {
  return requestJson<{ application: ApplicationRecord | null }>(
    buildUrl("", { type: "application", applicationId })
  ).then((value) => value.application);
}

export async function getDocumentsForApplication(applicationId: string) {
  return requestJson<{ documents: ApplicationDocumentRecord[] }>(
    buildUrl("", { type: "documents", applicationId })
  ).then((value) => value.documents);
}

export async function getDocumentById(documentId: string) {
  return requestJson<{ document: ApplicationDocumentRecord | null }>(
    buildUrl("", { type: "document", documentId })
  ).then((value) => value.document);
}

export async function writeDocument(input: RouteDocumentInput) {
  return requestJson<{ document: ApplicationDocumentRecord }>(API_BASE, {
    method: "POST",
    body: JSON.stringify({
      action: "write-document",
      document: input,
    }),
  }).then((value) => value.document);
}

export async function requestUploadSession(input: UploadSessionInput) {
  return requestJson<UploadSessionResponse>(API_BASE, {
    method: "POST",
    body: JSON.stringify({
      action: "request-upload-session",
      ...input,
    }),
  });
}

export async function analyzeUpload(input: UploadAnalysisInput) {
  return requestJson<UploadAnalysisResponse>(API_BASE, {
    method: "POST",
    body: JSON.stringify({
      action: "analyze-upload",
      ...input,
    }),
  });
}

export async function updateDocument(documentId: string, patch: Partial<ApplicationDocumentRecord>) {
  return requestJson<{ document: ApplicationDocumentRecord | null }>(API_BASE, {
    method: "POST",
    body: JSON.stringify({
      action: "update-document",
      documentId,
      patch,
    }),
  }).then((value) => value.document);
}

export async function appendVerificationChecks(
  applicationId: string,
  documentId: string,
  checks: VerificationCheck[]
) {
  return requestJson<{ checkIds: string[] }>(API_BASE, {
    method: "POST",
    body: JSON.stringify({
      action: "append-checks",
      applicationId,
      documentId,
      checks,
    }),
  }).then((value) => value.checkIds);
}

export async function getChecksForDocument(documentId: string) {
  return requestJson<{ checks: VerificationCheckRecord[] }>(
    buildUrl("", { type: "checks", documentId })
  ).then((value) => value.checks);
}

export async function appendApplicationEvent(input: NewEventInput) {
  return requestJson<{ ok: true }>(API_BASE, {
    method: "POST",
    body: JSON.stringify({
      action: "append-event",
      ...input,
    }),
  });
}

export async function upsertAlert(
  alert: Omit<ApplicationAlertRecord, "id" | "createdAt" | "updatedAt" | "resolvedAt"> & { id?: string }
) {
  const response = await requestJson<{ alert: ApplicationAlertRecord }>(API_BASE, {
    method: "POST",
    body: JSON.stringify({
      action: "upsert-alert",
      alert,
    }),
  });
  return response.alert;
}

export async function resolveAlert(applicationId: string, dedupeKey: string) {
  return requestJson<{ resolvedCount: number }>(API_BASE, {
    method: "POST",
    body: JSON.stringify({
      action: "resolve-alert",
      applicationId,
      dedupeKey,
    }),
  }).then((value) => value.resolvedCount);
}

export async function clearAlerts(applicationId: string) {
  return requestJson<{ ok: true }>(API_BASE, {
    method: "POST",
    body: JSON.stringify({
      action: "clear-alerts",
      applicationId,
    }),
  });
}

export async function getAlertsForApplication(applicationId: string) {
  return requestJson<{ alerts: ApplicationAlertRecord[] }>(buildUrl("", { type: "alerts", applicationId })).then(
    (value) => value.alerts
  );
}

export async function listChecksumsForApplication(applicationId: string) {
  return requestJson<{ checksums: string[] }>(buildUrl("", { type: "checksums", applicationId })).then((value) =>
    new Set(value.checksums)
  );
}
