import { NextRequest, NextResponse } from "next/server";

function getClientIp(req: NextRequest): string {
  // Vercel injecte l'IP réelle dans ce header
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  // En local dev, pas de proxy → pas de headers IP → connexion directe = localhost
  const host = req.headers.get("host") ?? "";
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) return "127.0.0.1";
  return "unknown";
}

// Normalise IPv6-mapped IPv4 (::ffff:127.0.0.1 → 127.0.0.1)
function normalizeIp(ip: string): string {
  if (ip.startsWith("::ffff:")) return ip.slice(7);
  return ip;
}

export async function GET(req: NextRequest) {
  const adminIp = process.env.ADMIN_IP ?? "";
  const clientIp = normalizeIp(getClientIp(req));

  const adminIps = adminIp.split(",").map((ip) => normalizeIp(ip.trim())).filter(Boolean);
  const isAdmin = adminIps.length > 0 && adminIps.includes(clientIp);

  return NextResponse.json({ admin: isAdmin });
}
