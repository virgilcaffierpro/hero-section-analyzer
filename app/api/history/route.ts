import { NextRequest, NextResponse } from "next/server";
import { getHistory, clearCachedUrl } from "@/lib/cache";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  const history = getHistory(url ?? undefined);
  // Return most recent first
  return NextResponse.json([...history].reverse());
}

export async function DELETE(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (url) {
    clearCachedUrl(url);
  }
  return NextResponse.json({ ok: true });
}
