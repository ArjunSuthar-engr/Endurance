import { NextResponse } from "next/server";
import { getApplicationState } from "@/lib/student-application-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getApplicationState(), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
