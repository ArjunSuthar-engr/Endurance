import {
  requiredDocumentTypes,
  type ApplicationAlertRecord,
  type ApplicationDocumentRecord,
  type ApplicationEventRecord,
  type ApplicationRecord,
  type DocumentType,
  type UserRecord,
  type VerificationCheck,
  type VerificationCheckRecord,
} from "@/lib/student-application-schema";
import { validateUploadRequest } from "@/lib/document-policy";

const DEMO_USER_ID = "demo-user-student";
const DEMO_APPLICATION_ID = "APP-STUDENT-0001";
const UPLOAD_SESSION_TTL_MS = 15 * 60 * 1000;

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

type UploadSession = {
  token: string;
  applicationId: string;
  userId: string;
  documentId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  checksum: string;
  objectKey: string;
  expiresAt: string;
};

type BackendApplicationStore = {
  users: UserRecord[];
  applications: ApplicationRecord[];
  documents: Array<ApplicationDocumentRecord>;
  verificationChecks: VerificationCheckRecord[];
  alerts: ApplicationAlertRecord[];
  events: ApplicationEventRecord[];
  uploadSessions: Record<string, UploadSession>;
};

type AppGlobalStore = {
  __enduranceBackendStore?: BackendApplicationStore;
};

function createId(prefix: string) {
  const crypto = globalThis.crypto as Crypto | undefined;
  if (crypto?.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}-${Math.floor(Math.random() * 999_999_999)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function nowUtcMs() {
  return Date.now();
}

function createObjectKey(applicationId: string, userId: string, documentId: string, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
  return `private/${applicationId}/${userId}/${documentId}/${safeName}`;
}

function createDefaultUser(): UserRecord {
  const createdAt = nowIso();
  return {
    id: DEMO_USER_ID,
    email: "demo@student.endurance.local",
    displayName: "Demo Student",
    role: "student",
    createdAt,
    updatedAt: createdAt,
  };
}

function createDefaultApplication(userId: string): ApplicationRecord {
  const createdAt = nowIso();
  return {
    id: DEMO_APPLICATION_ID,
    userId,
    status: "active",
    requiredDocuments: [...requiredDocumentTypes],
    createdAt,
    updatedAt: createdAt,
  };
}

function getStore(): BackendApplicationStore {
  const globalForStore = globalThis as unknown as AppGlobalStore;
  if (!globalForStore.__enduranceBackendStore) {
    const seedUser = createDefaultUser();
    const seedApplication = createDefaultApplication(seedUser.id);
    globalForStore.__enduranceBackendStore = {
      users: [seedUser],
      applications: [seedApplication],
      documents: [],
      verificationChecks: [],
      alerts: [],
      events: [],
      uploadSessions: {},
    };
  }

  return globalForStore.__enduranceBackendStore;
}

function pruneUploadSessions(store: BackendApplicationStore) {
  const now = nowUtcMs();
  for (const [token, session] of Object.entries(store.uploadSessions)) {
    if (Date.parse(session.expiresAt) < now) {
      delete store.uploadSessions[token];
    }
  }
}

function ensureUser(userId: string) {
  const store = getStore();
  let user = store.users.find((item) => item.id === userId);
  if (!user) {
    user = createDefaultUser();
    user.id = userId;
    store.users.push(user);
  }

  return user;
}

function ensureApplication(applicationId: string, userId: string) {
  const store = getStore();
  let application = store.applications.find((item) => item.id === applicationId);
  if (!application) {
    application = createDefaultApplication(userId);
    application.id = applicationId;
    store.applications.push(application);
    return application;
  }

  if (application.userId !== userId) {
    throw new Error("Unauthorized application access.");
  }

  return application;
}

export function getUsersStore() {
  return getStore();
}

export function ensureApplicationData(userId: string = DEMO_USER_ID, applicationId: string = DEMO_APPLICATION_ID) {
  const store = getStore();
  const user = ensureUser(userId);
  const application = ensureApplication(applicationId, user.id);
  return { user, application };
}

export function getApplicationRecord(applicationId: string) {
  return getStore().applications.find((item) => item.id === applicationId) ?? null;
}

export function getDocumentsForApplication(applicationId: string) {
  return getStore().documents.filter((document) => document.applicationId === applicationId);
}

export function getDocumentById(documentId: string) {
  return getStore().documents.find((document) => document.id === documentId) ?? null;
}

export function writeDocument(input: NewDocumentInput, id?: string): ApplicationDocumentRecord {
  const store = getStore();
  const documentId = id ?? createId("doc");
  const now = nowIso();

  const document: ApplicationDocumentRecord = {
    id: documentId,
    applicationId: input.applicationId,
    userId: input.userId,
    fileName: input.fileName,
    fileSize: input.fileSize,
    mimeType: input.mimeType,
    checksum: input.checksum,
    documentType: input.documentType,
    status: input.status,
    uploadedAt: input.uploadedAt,
    authenticityScore: input.authenticityScore,
    rejectionReason: input.rejectionReason,
    checks: [],
    checkIds: [],
    createdAt: now,
    updatedAt: now,
  };

  const existingIndex = store.documents.findIndex((document) => document.id === documentId);
  if (existingIndex >= 0) {
    store.documents.splice(existingIndex, 1);
  }

  store.documents = [document, ...store.documents];
  return document;
}

export function updateDocument(documentId: string, patch: Partial<ApplicationDocumentRecord>) {
  const store = getStore();
  const index = store.documents.findIndex((document) => document.id === documentId);
  if (index === -1) {
    return null;
  }

  store.documents[index] = {
    ...store.documents[index],
    ...patch,
    updatedAt: nowIso(),
  };

  return store.documents[index];
}

export function appendVerificationChecks(applicationId: string, documentId: string, checks: VerificationCheck[]) {
  const store = getStore();
  const checkIds: string[] = [];
  const createdAt = nowIso();

  for (const check of checks) {
    const checkId = createId("chk");
    const checkRecord: VerificationCheckRecord = {
      ...check,
      id: checkId,
      applicationId,
      documentId,
      createdAt,
    };

    store.verificationChecks.push(checkRecord);
    checkIds.push(checkId);
  }

  const document = getDocumentById(documentId);
  if (!document) {
    return [];
  }

  document.checkIds = checkIds;
  return checkIds;
}

export function getChecksForDocument(documentId: string) {
  return getStore().verificationChecks.filter((item) => item.documentId === documentId);
}

export function appendApplicationEvent(input: NewEventInput) {
  const store = getStore();
  store.events.push({
    id: createId("evt"),
    applicationId: input.applicationId,
    eventType: input.eventType,
    payload: input.payload,
    createdAt: nowIso(),
  } satisfies ApplicationEventRecord);
}

export function upsertAlert(
  alert: Omit<ApplicationAlertRecord, "id" | "createdAt" | "updatedAt" | "resolvedAt"> & { id?: string }
) {
  const store = getStore();
  const existing = store.alerts.find(
    (item) =>
      item.dedupeKey === alert.dedupeKey &&
      item.applicationId === alert.applicationId &&
      item.resolvedAt === undefined
  );
  const now = nowIso();

  if (existing) {
    existing.message = alert.message;
    existing.severity = alert.severity;
    existing.updatedAt = now;
    return existing;
  }

  const record: ApplicationAlertRecord = {
    ...alert,
    createdAt: now,
    updatedAt: now,
    id: alert.id || createId("alt"),
    resolvedAt: undefined,
  };

  store.alerts.push(record);
  return record;
}

export function resolveAlert(applicationId: string, dedupeKey: string) {
  const store = getStore();
  const now = nowIso();
  let resolvedCount = 0;

  for (const alert of store.alerts) {
    if (alert.applicationId === applicationId && alert.dedupeKey === dedupeKey && !alert.resolvedAt) {
      alert.resolvedAt = now;
      alert.updatedAt = now;
      resolvedCount += 1;
    }
  }

  return resolvedCount;
}

export function clearAlerts(applicationId: string) {
  const store = getStore();
  const now = nowIso();

  for (const alert of store.alerts) {
    if (alert.applicationId === applicationId && !alert.resolvedAt) {
      alert.resolvedAt = now;
      alert.updatedAt = now;
    }
  }
}

export function getAlertsForApplication(applicationId: string) {
  return getStore().alerts.filter((item) => item.applicationId === applicationId && !item.resolvedAt);
}

export function listChecksumsForApplication(applicationId: string) {
  return new Set(getDocumentsForApplication(applicationId).map((document) => document.checksum));
}

export function requestUploadSession(input: {
  applicationId: string;
  userId: string;
  documentType: DocumentType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  checksum: string;
}) {
  const store = getStore();
  pruneUploadSessions(store);
  const validation = validateUploadRequest({
    documentType: input.documentType,
    fileName: input.fileName,
    fileSize: input.fileSize,
    mimeType: input.mimeType,
  });
  if (validation.errors.length > 0) {
    throw new Error(validation.errors.join(" "));
  }

  const { user, application } = ensureApplicationData(input.userId, input.applicationId);

  const pendingDocument = writeDocument({
    applicationId: application.id,
    userId: user.id,
    fileName: input.fileName,
    fileSize: input.fileSize,
    mimeType: input.mimeType,
    checksum: input.checksum,
    documentType: input.documentType,
    status: "verifying",
    authenticityScore: 0,
    uploadedAt: nowIso(),
  });

  const token = createId("upl");
  const objectKey = createObjectKey(application.id, user.id, pendingDocument.id, input.fileName);
  const expiresAt = new Date(nowUtcMs() + UPLOAD_SESSION_TTL_MS).toISOString();
  store.uploadSessions[token] = {
    token,
    applicationId: application.id,
    userId: user.id,
    documentId: pendingDocument.id,
    fileName: input.fileName,
    fileSize: input.fileSize,
    mimeType: input.mimeType,
    checksum: input.checksum,
    objectKey,
    expiresAt,
  };
  pendingDocument.objectKey = objectKey;

  return {
    token,
    objectKey,
    expiresAt,
    document: pendingDocument,
  };
}

export { DEMO_APPLICATION_ID, DEMO_USER_ID };
