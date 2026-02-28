import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY;
  return NextResponse.json({
    version: "195c5e5", // haiku-4-5 + prefill JSON + newline fix
    hasKey: !!key,
    keyPrefix: key ? key.slice(0, 10) + "..." : null,
    isVercel: !!process.env.VERCEL,
    nodeEnv: process.env.NODE_ENV,
  });
}
