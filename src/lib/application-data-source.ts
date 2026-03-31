import type {
  ApplicationAlertRecord,
  ApplicationDocumentRecord,
  ApplicationEventRecord,
  ApplicationRecord,
  DocumentType,
  UserRecord,
  VerificationCheck,
  VerificationCheckRecord,
} from "@/lib/student-application-schema";
import * as demoStore from "@/lib/application-store";
import * as backendStore from "@/lib/application-backend-client";

export type ApplicationDataSourceMode = "demo-local" | "server-backend";

const useBackendStore = process.env.NEXT_PUBLIC_APPLICATION_DATA_SOURCE_MODE === "server-backend";

export type NewDocumentInput = {
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

export type NewEventInput = {
  applicationId: string;
  eventType: ApplicationEventRecord["eventType"];
  payload: Record<string, string>;
};

export type UploadSession = {
  token: string;
  objectKey: string;
  expiresAt: string;
  document: ApplicationDocumentRecord;
};

export type NewUploadSessionInput = {
  applicationId: string;
  userId: string;
  documentType: DocumentType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  checksum: string;
};

export const CURRENT_DATA_SOURCE_MODE: ApplicationDataSourceMode = useBackendStore ? "server-backend" : "demo-local";

export const DEMO_APPLICATION_ID = useBackendStore ? backendStore.DEMO_APPLICATION_ID : demoStore.DEMO_APPLICATION_ID;
export const DEMO_USER_ID = useBackendStore ? backendStore.DEMO_USER_ID : demoStore.DEMO_USER_ID;

export function getApplicationDataSourceMode() {
  return CURRENT_DATA_SOURCE_MODE;
}

export function getUsersStore(): Promise<{ users: UserRecord[] }> {
  if (useBackendStore) {
    return backendStore.getUsersStore();
  }

  return Promise.resolve({
    users: demoStore.getUsersStore().users,
  });
}

export function ensureApplicationData(userId: string = DEMO_USER_ID, applicationId: string = DEMO_APPLICATION_ID) {
  if (useBackendStore) {
    return backendStore.ensureApplicationData(userId, applicationId);
  }

  return Promise.resolve(demoStore.ensureApplicationData(userId, applicationId));
}

export function getApplicationRecord(applicationId: string) {
  if (useBackendStore) {
    return backendStore.getApplicationRecord(applicationId);
  }

  return Promise.resolve(demoStore.getApplicationRecord(applicationId));
}

export function getDocumentsForApplication(applicationId: string) {
  if (useBackendStore) {
    return backendStore.getDocumentsForApplication(applicationId);
  }

  return Promise.resolve(demoStore.getDocumentsForApplication(applicationId));
}

export function getDocumentById(documentId: string) {
  if (useBackendStore) {
    return backendStore.getDocumentById(documentId);
  }

  return Promise.resolve(demoStore.getDocumentById(documentId));
}

export function deleteDocument(documentId: string) {
  if (useBackendStore) {
    return Promise.reject(new Error("Document deletion is not available in backend mode yet."));
  }

  return Promise.resolve(demoStore.deleteDocument(documentId));
}

export function writeDocument(input: NewDocumentInput, id?: string) {
  if (useBackendStore) {
    return backendStore.writeDocument(input);
  }

  return Promise.resolve(demoStore.writeDocument(input, id));
}

export function updateDocument(documentId: string, patch: Partial<ApplicationDocumentRecord>) {
  if (useBackendStore) {
    return backendStore.updateDocument(documentId, patch);
  }

  return Promise.resolve(demoStore.updateDocument(documentId, patch));
}

export function appendVerificationChecks(applicationId: string, documentId: string, checks: VerificationCheck[]) {
  if (useBackendStore) {
    return backendStore.appendVerificationChecks(applicationId, documentId, checks);
  }

  return Promise.resolve(demoStore.appendVerificationChecks(applicationId, documentId, checks));
}

export function getChecksForDocument(documentId: string): Promise<VerificationCheckRecord[]> {
  if (useBackendStore) {
    return backendStore.getChecksForDocument(documentId);
  }

  return Promise.resolve(demoStore.getChecksForDocument(documentId));
}

export function appendApplicationEvent(input: NewEventInput) {
  if (useBackendStore) {
    return backendStore.appendApplicationEvent(input);
  }

  return Promise.resolve(demoStore.appendApplicationEvent(input));
}

export function upsertAlert(
  alert: Omit<ApplicationAlertRecord, "id" | "createdAt" | "updatedAt" | "resolvedAt"> & { id?: string }
) {
  if (useBackendStore) {
    return backendStore.upsertAlert(alert);
  }

  return Promise.resolve(demoStore.upsertAlert(alert));
}

export function resolveAlert(applicationId: string, dedupeKey: string) {
  if (useBackendStore) {
    return backendStore.resolveAlert(applicationId, dedupeKey);
  }

  return Promise.resolve(demoStore.resolveAlert(applicationId, dedupeKey));
}

export function clearAlerts(applicationId: string) {
  if (useBackendStore) {
    return backendStore.clearAlerts(applicationId);
  }

  return Promise.resolve(demoStore.clearAlerts(applicationId));
}

export function clearApplicationPacket(applicationId: string) {
  if (useBackendStore) {
    return Promise.reject(new Error("Application reset is only available in local demo mode."));
  }

  return Promise.resolve(demoStore.clearApplicationPacket(applicationId));
}

export function getAlertsForApplication(applicationId: string) {
  if (useBackendStore) {
    return backendStore.getAlertsForApplication(applicationId);
  }

  return Promise.resolve(demoStore.getAlertsForApplication(applicationId));
}

export function listChecksumsForApplication(applicationId: string) {
  if (useBackendStore) {
    return backendStore.listChecksumsForApplication(applicationId);
  }

  return Promise.resolve(demoStore.listChecksumsForApplication(applicationId));
}

export function requestUploadSession(input: NewUploadSessionInput): Promise<UploadSession> {
  if (useBackendStore) {
    return backendStore.requestUploadSession(input);
  }

  return Promise.resolve(demoStore.requestUploadSession(input));
}
