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

const STORAGE_KEY = "endurance-application-store-v1";
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

type ApplicationTables = {
  users: UserRecord[];
  applications: ApplicationRecord[];
  documents: Array<ApplicationDocumentRecord>;
  verificationChecks: VerificationCheckRecord[];
  alerts: ApplicationAlertRecord[];
  events: ApplicationEventRecord[];
};

function createId(prefix: string) {
  const crypto = globalThis.crypto as Crypto | undefined;
  if (crypto?.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}-${Math.floor(Math.random() * 999_999_999)}`;
}

function createUploadToken(prefix: string) {
  return createId(prefix);
}

function nowIso() {
  return new Date().toISOString();
}

function getEmptyStore(): ApplicationTables {
  return {
    users: [],
    applications: [],
    documents: [],
    verificationChecks: [],
    alerts: [],
    events: [],
  };
}

const inMemoryFallbackStore: ApplicationTables = getEmptyStore();
const inMemoryUploadSessions: Record<string, UploadSession> = {};
let initialized = false;

function isBrowser() {
  return typeof window !== "undefined";
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

function getObjectKey(applicationId: string, userId: string, documentId: string, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
  return `private/${applicationId}/${userId}/${documentId}/${safeName}`;
}

function pruneUploadSessions() {
  const now = Date.now();
  for (const [token, session] of Object.entries(inMemoryUploadSessions)) {
    if (Date.parse(session.expiresAt) < now) {
      delete inMemoryUploadSessions[token];
    }
  }
}

function hydrateTable(): ApplicationTables {
  if (!isBrowser()) {
    if (!initialized) {
      if (inMemoryFallbackStore.users.length === 0) {
        const user = createDefaultUser();
        inMemoryFallbackStore.users.push(user);
        inMemoryFallbackStore.applications.push(createDefaultApplication(user.id));
      }

      initialized = true;
    }

    return inMemoryFallbackStore;
  }

  if (!initialized) {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<ApplicationTables>;
        if (Array.isArray(parsed.users) && Array.isArray(parsed.applications)) {
          inMemoryFallbackStore.users = parsed.users ?? [];
          inMemoryFallbackStore.applications = parsed.applications ?? [];
          inMemoryFallbackStore.documents = parsed.documents ?? [];
          inMemoryFallbackStore.verificationChecks = parsed.verificationChecks ?? [];
          inMemoryFallbackStore.alerts = parsed.alerts ?? [];
          inMemoryFallbackStore.events = parsed.events ?? [];
        }
      } catch (error) {
        console.warn("[persistence] Falling back to in-memory seed due to invalid state file.");
      }
    }

    if (inMemoryFallbackStore.users.length === 0) {
      const user = createDefaultUser();
      inMemoryFallbackStore.users.push(user);
      inMemoryFallbackStore.applications.push(createDefaultApplication(user.id));
      persistStore(inMemoryFallbackStore);
    }

    initialized = true;
  }

  return inMemoryFallbackStore;
}

function persistStore(store: ApplicationTables) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function ensureApplication(applicationId: string, userId: string) {
  const store = hydrateTable();
  let application = store.applications.find((item) => item.id === applicationId);
  if (!application) {
    application = createDefaultApplication(userId);
    application.id = applicationId;
    store.applications.push(application);
    persistStore(store);
  } else if (application.userId !== userId) {
    throw new Error("Unauthorized application access.");
  }

  return application;
}

function ensureUser(userId: string) {
  const store = hydrateTable();
  let user = store.users.find((item) => item.id === userId);
  if (!user) {
    user = createDefaultUser();
    user.id = userId;
    store.users.push(user);
    persistStore(store);
  }

  return user;
}

export function getUsersStore() {
  return hydrateTable();
}

export function ensureApplicationData(userId: string = DEMO_USER_ID, applicationId: string = DEMO_APPLICATION_ID) {
  const store = hydrateTable();
  const user = ensureUser(userId);
  const application = ensureApplication(applicationId, user.id);
  return { user, application };
}

export function getApplicationRecord(applicationId: string) {
  return hydrateTable().applications.find((item) => item.id === applicationId) ?? null;
}

export function getDocumentsForApplication(applicationId: string) {
  return hydrateTable().documents.filter((document) => document.applicationId === applicationId);
}

export function getDocumentById(documentId: string) {
  return hydrateTable().documents.find((document) => document.id === documentId) ?? null;
}

export function writeDocument(input: NewDocumentInput, id?: string): ApplicationDocumentRecord {
  const store = hydrateTable();
  const documentId = id ?? createId("doc");
  const now = nowIso();
  const existing = store.documents.find((document) => document.id === documentId);
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

  if (existing) {
    store.documents = store.documents.filter((item) => item.id !== documentId);
  }

  store.documents = [document, ...store.documents.filter((item) => item.id !== documentId)];
  persistStore(store);
  return document;
}

export function updateDocument(documentId: string, patch: Partial<ApplicationDocumentRecord>) {
  const store = hydrateTable();
  const index = store.documents.findIndex((document) => document.id === documentId);
  if (index === -1) {
    return null;
  }

  store.documents[index] = {
    ...store.documents[index],
    ...patch,
    updatedAt: nowIso(),
  };

  persistStore(store);
  return store.documents[index];
}

export function appendVerificationChecks(applicationId: string, documentId: string, checks: VerificationCheck[]) {
  const store = hydrateTable();
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
    persistStore(store);
    return [];
  }

  document.checkIds = checkIds;
  persistStore(store);
  return checkIds;
}

export function getChecksForDocument(documentId: string) {
  return hydrateTable().verificationChecks.filter((item) => item.documentId === documentId);
}

export function appendApplicationEvent(input: NewEventInput) {
  const store = hydrateTable();
  store.events.push({
    id: createId("evt"),
    applicationId: input.applicationId,
    eventType: input.eventType,
    payload: input.payload,
    createdAt: nowIso(),
  });

  persistStore(store);
}

export function upsertAlert(
  alert: Omit<ApplicationAlertRecord, "id" | "createdAt" | "updatedAt" | "resolvedAt"> & { id?: string }
) {
  const store = hydrateTable();
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
    persistStore(store);
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
  persistStore(store);
  return record;
}

export function resolveAlert(applicationId: string, dedupeKey: string) {
  const store = hydrateTable();
  const now = nowIso();
  let resolvedCount = 0;

  for (const alert of store.alerts) {
    if (alert.applicationId === applicationId && alert.dedupeKey === dedupeKey && !alert.resolvedAt) {
      alert.resolvedAt = now;
      alert.updatedAt = now;
      resolvedCount += 1;
    }
  }

  persistStore(store);
  return resolvedCount;
}

export function clearAlerts(applicationId: string) {
  const store = hydrateTable();
  const now = nowIso();

  for (const alert of store.alerts) {
    if (alert.applicationId === applicationId && !alert.resolvedAt) {
      alert.resolvedAt = now;
      alert.updatedAt = now;
    }
  }

  persistStore(store);
}

export function getAlertsForApplication(applicationId: string) {
  return hydrateTable().alerts.filter((item) => item.applicationId === applicationId && !item.resolvedAt);
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
  pruneUploadSessions();
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
  const pending = writeDocument(
    {
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
    },
    createUploadToken("doc")
  );

  const token = createUploadToken("upl");
  const expiresAt = new Date(Date.now() + UPLOAD_SESSION_TTL_MS).toISOString();
  const objectKey = getObjectKey(application.id, user.id, pending.id, input.fileName);
  inMemoryUploadSessions[token] = {
    token,
    applicationId: application.id,
    userId: user.id,
    documentId: pending.id,
    fileName: input.fileName,
    fileSize: input.fileSize,
    mimeType: input.mimeType,
    checksum: input.checksum,
    objectKey,
    expiresAt,
  };
  pending.objectKey = objectKey;

  return {
    token,
    objectKey,
    expiresAt,
    document: pending,
  };
}

export { DEMO_APPLICATION_ID, DEMO_USER_ID };
