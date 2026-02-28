import { NextRequest, NextResponse } from "next/server";

function getClientIp(req: NextRequest): string {
  // Vercel injecte l'IP réelle dans ce header
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function GET(req: NextRequest) {
  const adminIp = process.env.ADMIN_IP ?? "";
  const clientIp = getClientIp(req);

  const isAdmin = adminIp !== "" && clientIp === adminIp;

  return NextResponse.json({ admin: isAdmin });
}
