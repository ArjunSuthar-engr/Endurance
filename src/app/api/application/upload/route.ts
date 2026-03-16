import { NextResponse } from "next/server";
import { enqueueUpload } from "@/lib/student-application-service";
import { isDocumentType } from "@/lib/student-application-schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const documentTypeValue = String(formData.get("documentType") || "");
  const file = formData.get("file");

  if (!isDocumentType(documentTypeValue)) {
    return NextResponse.json(
      {
        error: "Invalid document type.",
      },
      { status: 400 }
    );
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      {
        error: "A file upload is required.",
      },
      { status: 400 }
    );
  }

  const result = await enqueueUpload(documentTypeValue, file);
  return NextResponse.json(result, {
    status: 202,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
