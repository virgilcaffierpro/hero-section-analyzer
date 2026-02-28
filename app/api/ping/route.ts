import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY;
  return NextResponse.json({
    version: "ef9d520", // latest commit — haiku + maxRetries:0 + timeout:25s
    hasKey: !!key,
    keyPrefix: key ? key.slice(0, 10) + "..." : null,
    isVercel: !!process.env.VERCEL,
    nodeEnv: process.env.NODE_ENV,
  });
}
