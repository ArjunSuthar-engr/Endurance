import {
  requiredDocumentTypes,
  type ApplicationAlert,
  type ApplicationState,
  type DocumentType,
  type UploadedDocument,
  type VerificationCheck,
} from "@/lib/student-application-schema";
import {
  DEMO_APPLICATION_ID,
  DEMO_USER_ID,
  appendApplicationEvent,
  appendVerificationChecks,
  getAlertsForApplication,
  getApplicationRecord,
  getChecksForDocument,
  getDocumentById,
  getDocumentsForApplication,
  listChecksumsForApplication,
  resolveAlert,
  ensureApplicationData,
  upsertAlert,
  updateDocument,
  requestUploadSession,
} from "@/lib/application-data-source";
import { analyzeUpload } from "@/lib/application-backend-client";
import { evaluateAlertRules } from "@/lib/application-alert-rules";

type VerificationResult = {
  status: "verified" | "rejected";
  authenticityScore: number;
  checks: VerificationCheck[];
  rejectionReason?: string;
};

type AppEntity = {
  applicationId: string;
  documents: UploadedDocument[];
};

const APPLICATION_ID = DEMO_APPLICATION_ID;
const USER_ID = DEMO_USER_ID;

async function withDocumentChecks(document: UploadedDocument): Promise<UploadedDocument> {
  const checks = await getChecksForDocument(document.id);
  if (checks.length === 0) {
    return document;
  }

  return {
    ...document,
    checks,
  };
}

async function readApplicationState(): Promise<AppEntity> {
  const persisted = await getApplicationRecord(APPLICATION_ID);
  const documents = await Promise.all((await getDocumentsForApplication(APPLICATION_ID)).map(withDocumentChecks));

  const hasFallback = persisted && persisted.id;
  if (!hasFallback) {
    await ensureApplicationData(USER_ID, APPLICATION_ID);
  }

  return {
    applicationId: persisted?.id ?? APPLICATION_ID,
    documents: documents.sort((a, b) => Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt)),
  };
}

function latestUpdateDate(entity: AppEntity, fallback: string) {
  let latest = Date.parse(fallback);

  for (const document of entity.documents) {
    const uploadedAt = Date.parse(document.uploadedAt);
    if (!Number.isNaN(uploadedAt) && uploadedAt > latest) {
      latest = uploadedAt;
    }
  }

  if (Number.isNaN(latest)) {
    return new Date().toISOString();
  }

  return new Date(latest).toISOString();
}

async function computeState(): Promise<ApplicationState> {
  await ensureApplicationData(USER_ID, APPLICATION_ID);
  const applicationRecord = await getApplicationRecord(APPLICATION_ID);
  const entity = await readApplicationState();
  const ruleEvaluation = evaluateAlertRules(entity.documents);
  const verifiedByType = requiredDocumentTypes.filter(
    (documentType) => ruleEvaluation.requirementStatuses[documentType] === "verified"
  );
  const missingDocuments = requiredDocumentTypes.filter((type) => !verifiedByType.includes(type));
  const progressPercent = Math.round(
    ((requiredDocumentTypes.length - missingDocuments.length) / requiredDocumentTypes.length) * 100
  );
  const alerts = await syncApplicationAlerts(entity.applicationId, entity.documents);

  return {
    applicationId: applicationRecord?.id ?? APPLICATION_ID,
    progressPercent,
    requiredDocuments: requiredDocumentTypes,
    missingDocuments,
    uploadedDocuments: entity.documents,
    alerts,
    updatedAt: latestUpdateDate(entity, applicationRecord?.updatedAt ?? new Date().toISOString()),
  };
}

async function updateDocumentResult(documentId: string, result: VerificationResult) {
  const document = await getDocumentById(documentId);
  if (!document) {
    return;
  }

  const updated = await updateDocument(documentId, {
    status: result.status,
    authenticityScore: result.authenticityScore,
    rejectionReason: result.rejectionReason,
    checks: result.checks,
  });

  if (!updated) {
    return;
  }

  await appendVerificationChecks(document.applicationId, documentId, result.checks);
  await appendApplicationEvent({
    applicationId: document.applicationId,
    eventType: "document_result_updated",
    payload: {
      documentId,
      status: result.status,
      score: String(result.authenticityScore),
      rejectionReason: result.rejectionReason ?? "",
    },
  });
}

async function syncApplicationAlerts(applicationId: string, documents: UploadedDocument[]) {
  const evaluation = evaluateAlertRules(documents);
  const desiredKeys = new Set(evaluation.alerts.map((alert) => alert.dedupeKey));
  const currentAlerts = await getAlertsForApplication(applicationId);

  for (const alert of evaluation.alerts) {
    await upsertAlert({
      applicationId,
      dedupeKey: alert.dedupeKey,
      severity: alert.severity,
      message: alert.message,
    });
  }

  for (const alert of currentAlerts) {
    if (!desiredKeys.has(alert.dedupeKey)) {
      await resolveAlert(applicationId, alert.dedupeKey);
    }
  }

  const nextAlerts = await getAlertsForApplication(applicationId);
  return nextAlerts.map(
    (alert): ApplicationAlert => ({
      id: alert.dedupeKey,
      severity: alert.severity,
      message: alert.message,
    })
  );
}

function toBase64(bytes: Uint8Array) {
  const chunkSize = 8192;
  let binary = "";
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

export async function enqueueUpload(documentType: DocumentType, file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";
  const existingChecksums = await listChecksumsForApplication(APPLICATION_ID);
  const analysis = await analyzeUpload({
    applicationId: APPLICATION_ID,
    userId: USER_ID,
    documentType,
    fileName: file.name,
    fileSize: file.size,
    mimeType,
    contentBase64: toBase64(bytes),
    existingChecksums: Array.from(existingChecksums),
  });
  const uploadSession = await requestUploadSession({
    applicationId: APPLICATION_ID,
    userId: USER_ID,
    documentType,
    fileName: file.name,
    fileSize: file.size,
    mimeType,
    checksum: analysis.checksum,
  });

  const verificationDelay = 900 + Math.floor(Math.random() * 1400);
  setTimeout(() => {
    void updateDocumentResult(uploadSession.document.id, analysis.result);
  }, verificationDelay);

  return { documentId: uploadSession.document.id, uploadToken: uploadSession.token };
}

export async function getApplicationState() {
  return computeState();
}
