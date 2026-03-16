import { NextRequest, NextResponse } from "next/server";
import {
  appendApplicationEvent as appendEvent,
  appendVerificationChecks as appendChecks,
  ensureApplicationData,
  getAlertsForApplication,
  getApplicationRecord,
  getChecksForDocument,
  getDocumentById,
  getDocumentsForApplication,
  listChecksumsForApplication,
  upsertAlert,
  writeDocument,
  clearAlerts,
  updateDocument,
  requestUploadSession,
  getUsersStore,
  type NewDocumentInput,
  type NewEventInput,
} from "@/lib/server-application-store";
import { isDocumentType, type DocumentType, type VerificationCheck } from "@/lib/student-application-schema";

type ActionRequest = {
  action: string;
  userId?: string;
  applicationId?: string;
  documentId?: string;
  documentType?: DocumentType;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  checksum?: string;
  document?: NewDocumentInput;
  patch?: Record<string, unknown>;
  checks?: VerificationCheck[];
  alert?: Record<string, unknown>;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const type = params.get("type");
  const applicationId = params.get("applicationId") ?? undefined;
  const userId = params.get("userId") ?? undefined;
  const documentId = params.get("documentId") ?? undefined;

  switch (type) {
    case "users": {
      return NextResponse.json({ users: getUsersStore().users });
    }
    case "application": {
      if (!applicationId) {
        return jsonError("Missing applicationId");
      }

      return NextResponse.json({ application: getApplicationRecord(applicationId) });
    }
    case "documents": {
      if (!applicationId) {
        return jsonError("Missing applicationId");
      }

      return NextResponse.json({ documents: getDocumentsForApplication(applicationId) });
    }
    case "document": {
      if (!documentId) {
        return jsonError("Missing documentId");
      }

      return NextResponse.json({ document: getDocumentById(documentId) });
    }
    case "checks": {
      if (!documentId) {
        return jsonError("Missing documentId");
      }

      return NextResponse.json({ checks: getChecksForDocument(documentId) });
    }
    case "checksums": {
      if (!applicationId) {
        return jsonError("Missing applicationId");
      }

      return NextResponse.json({
        checksums: Array.from(listChecksumsForApplication(applicationId)),
      });
    }
    case "alerts": {
      if (!applicationId) {
        return jsonError("Missing applicationId");
      }

      return NextResponse.json({ alerts: getAlertsForApplication(applicationId) });
    }
    case "state": {
      if (!applicationId) {
        return jsonError("Missing applicationId");
      }

      const normalizedUserId = userId ?? "demo-user-student";
    const ensured = ensureApplicationData(normalizedUserId, applicationId);
      return NextResponse.json({
        application: ensured.application,
        documents: getDocumentsForApplication(applicationId),
        alerts: getAlertsForApplication(applicationId),
      });
    }
    default:
      return jsonError("Invalid type");
  }
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return jsonError("Invalid JSON payload");
  }

  const body = payload as Partial<ActionRequest> & {
    action?: string;
    checks?: Array<{
      code: string;
      label: string;
      status: "pass" | "warn" | "fail";
      detail: string;
    }>;
  };
  const action = body.action ?? "";

  if (action === "ensure-application-data") {
    const userId = typeof body.userId === "string" ? body.userId : "demo-user-student";
    const applicationId = typeof body.applicationId === "string" ? body.applicationId : "APP-STUDENT-0001";
    const result = ensureApplicationData(userId, applicationId);
    return NextResponse.json(result);
  }

  if (action === "write-document") {
    if (!body.document) {
      return jsonError("Missing document payload");
    }

    const document = writeDocument(body.document as NewDocumentInput);
    return NextResponse.json({ document });
  }

  if (action === "request-upload-session") {
    if (
      typeof body.applicationId !== "string" ||
      typeof body.userId !== "string" ||
      typeof body.fileName !== "string" ||
      typeof body.documentType !== "string" ||
      !isDocumentType(body.documentType) ||
      typeof body.fileSize !== "number" ||
      typeof body.mimeType !== "string" ||
      typeof body.checksum !== "string"
    ) {
      return jsonError("Missing upload session fields");
    }

    try {
      const result = requestUploadSession({
        applicationId: body.applicationId,
        userId: body.userId,
        fileName: body.fileName,
        fileSize: body.fileSize,
        mimeType: body.mimeType,
        checksum: body.checksum,
        documentType: body.documentType as DocumentType,
      });

      return NextResponse.json(result);
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Invalid upload request", 400);
    }
  }

  if (action === "update-document") {
    if (!body.documentId || !body.patch || typeof body.patch !== "object") {
      return jsonError("Missing documentId or patch");
    }

    const document = updateDocument(body.documentId, body.patch as Record<string, unknown>);
    return NextResponse.json({ document });
  }

  if (action === "append-checks") {
    if (!body.documentId || !body.applicationId || !Array.isArray(body.checks)) {
      return jsonError("Missing documentId/applicationId/checks");
    }

    const ids = appendChecks(body.applicationId, body.documentId, body.checks);
    return NextResponse.json({ checkIds: ids });
  }

  if (action === "append-event") {
    const event = body as unknown as NewEventInput;
    if (!event.applicationId || !event.eventType || !event.payload) {
      return jsonError("Missing event payload");
    }

    appendEvent(event);
    return NextResponse.json({ ok: true });
  }

  if (action === "upsert-alert") {
    if (!body.alert) {
      return jsonError("Missing alert payload");
    }

    const alert = upsertAlert(body.alert as never);
    return NextResponse.json({ alert });
  }

  if (action === "clear-alerts") {
    if (!body.applicationId) {
      return jsonError("Missing applicationId");
    }

    clearAlerts(body.applicationId);
    return NextResponse.json({ ok: true });
  }

  return jsonError("Unsupported action");
}
