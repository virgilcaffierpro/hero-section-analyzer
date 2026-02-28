import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY;
  return NextResponse.json({
    version: "sonnet-concise", // sonnet-4-5 + no plan30Days + max 120 chars
    hasKey: !!key,
    keyPrefix: key ? key.slice(0, 10) + "..." : null,
    isVercel: !!process.env.VERCEL,
    nodeEnv: process.env.NODE_ENV,
  });
}
