import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Public, configuration-free liveness check for hosting platforms. */
export function GET() {
  return NextResponse.json({ status: "ok", service: "recipe-vault" });
}
