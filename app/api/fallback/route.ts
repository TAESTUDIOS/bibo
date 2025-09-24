// app/api/fallback/route.ts
// Server-side proxy for fallback chat requests to avoid CORS from the browser.
// It accepts a JSON body: { text: string, lastMessages?: any[], tone?: string, url?: string }
// If url is omitted, it uses process.env.NEXT_PUBLIC_FALLBACK_WEBHOOK.

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const text: string = body?.text ?? "";
    const lastMessages = Array.isArray(body?.lastMessages) ? body.lastMessages : [];
    const tone: string | undefined = body?.tone;
    const url: string | undefined = body?.url || process.env.NEXT_PUBLIC_FALLBACK_WEBHOOK;

    if (!url) {
      return NextResponse.json(
        { ok: false, error: "No fallback webhook URL configured." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lastMessages, tone }),
      cache: "no-store",
    });

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      data = { text: await res.text() };
    }

    if (!res.ok) {
      const msg = data?.error || `Fallback request failed (${res.status})`;
      return NextResponse.json(
        { ok: false, error: msg, data },
        { status: res.status, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json({ ok: true, ...data }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "proxy error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
