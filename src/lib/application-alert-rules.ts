import {
  documentTypeLabels,
  requiredDocumentTypes,
  type AlertSeverity,
  type DocumentType,
  type UploadedDocument,
} from "@/lib/student-application-schema";

export type AlertRuleKey = "missing-documents" | "rejected-documents" | "verification-running";
export type RequirementStatus = "missing" | "rejected" | "verifying" | "verified";

export type AlertRuleDefinition = {
  dedupeKey: AlertRuleKey;
  severity: AlertSeverity;
  message: string;
  documentTypes: DocumentType[];
};

export type AlertRuleEvaluation = {
  requirementStatuses: Record<DocumentType, RequirementStatus>;
  alerts: AlertRuleDefinition[];
};

function formatDocumentList(documentTypes: DocumentType[]) {
  return documentTypes.map((documentType) => documentTypeLabels[documentType]).join(", ");
}

export function getRequirementStatus(documentType: DocumentType, documents: UploadedDocument[]): RequirementStatus {
  const matching = documents.filter((document) => document.documentType === documentType);

  if (matching.some((document) => document.status === "verified")) {
    return "verified";
  }

  if (matching.some((document) => document.status === "verifying")) {
    return "verifying";
  }

  if (matching.some((document) => document.status === "rejected")) {
    return "rejected";
  }

  return "missing";
}

export function evaluateAlertRules(documents: UploadedDocument[]): AlertRuleEvaluation {
  const requirementStatuses = {} as Record<DocumentType, RequirementStatus>;
  const missingDocuments: DocumentType[] = [];
  const rejectedDocuments: DocumentType[] = [];
  const verifyingDocuments: DocumentType[] = [];

  for (const documentType of requiredDocumentTypes) {
    const status = getRequirementStatus(documentType, documents);
    requirementStatuses[documentType] = status;

    if (status === "missing") {
      missingDocuments.push(documentType);
    } else if (status === "rejected") {
      rejectedDocuments.push(documentType);
    } else if (status === "verifying") {
      verifyingDocuments.push(documentType);
    }
  }

  const alerts: AlertRuleDefinition[] = [];

  if (missingDocuments.length > 0) {
    alerts.push({
      dedupeKey: "missing-documents",
      severity: "warning",
      message: `Missing required files: ${formatDocumentList(missingDocuments)}.`,
      documentTypes: missingDocuments,
    });
  }

  if (rejectedDocuments.length > 0) {
    alerts.push({
      dedupeKey: "rejected-documents",
      severity: "critical",
      message: `Replace rejected required files: ${formatDocumentList(rejectedDocuments)}.`,
      documentTypes: rejectedDocuments,
    });
  }

  if (verifyingDocuments.length > 0) {
    alerts.push({
      dedupeKey: "verification-running",
      severity: "info",
      message: `Verification running for: ${formatDocumentList(verifyingDocuments)}.`,
      documentTypes: verifyingDocuments,
    });
  }

  return {
    requirementStatuses,
    alerts,
  };
}
