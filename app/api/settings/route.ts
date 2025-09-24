// app/api/settings/route.ts
// Single-user Settings stored in Neon Postgres
// Fields: tone, fallback_webhook, theme. Uses a singleton row with id='singleton'

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

async function ensureTable() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    tone TEXT NOT NULL DEFAULT 'Gentle',
    fallback_webhook TEXT NOT NULL DEFAULT '',
    notifications_webhook TEXT NOT NULL DEFAULT '',
    theme TEXT NOT NULL DEFAULT 'dark',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  // For older schemas, ensure new columns exist
  await sql`ALTER TABLE settings ADD COLUMN IF NOT EXISTS notifications_webhook TEXT NOT NULL DEFAULT ''`;
  // Ensure singleton row exists
  await sql`INSERT INTO settings (id) VALUES ('singleton')
           ON CONFLICT (id) DO NOTHING`;
}

export async function GET() {
  try {
    await ensureTable();
    const sql = getDb();
    const rows = await sql`SELECT tone, fallback_webhook, notifications_webhook, theme FROM settings WHERE id = 'singleton'`;
    const row = rows[0] || { tone: 'Gentle', fallback_webhook: '', notifications_webhook: '', theme: 'dark' };
    return NextResponse.json({ ok: true, settings: { tone: row.tone, fallbackWebhook: row.fallback_webhook, notificationsWebhook: row.notifications_webhook, theme: row.theme } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const tone = body?.tone ?? undefined;
    const fallbackWebhook = body?.fallbackWebhook ?? undefined;
    const notificationsWebhook = body?.notificationsWebhook ?? undefined;
    const theme = body?.theme ?? undefined;

    await ensureTable();
    const sql = getDb();
    // Upsert fields provided in body
    await sql`INSERT INTO settings (id, tone, fallback_webhook, notifications_webhook, theme)
              VALUES ('singleton', ${tone ?? 'Gentle'}, ${fallbackWebhook ?? ''}, ${notificationsWebhook ?? ''}, ${theme ?? 'dark'})
              ON CONFLICT (id) DO UPDATE SET
                tone = COALESCE(${tone}, settings.tone),
                fallback_webhook = COALESCE(${fallbackWebhook}, settings.fallback_webhook),
                notifications_webhook = COALESCE(${notificationsWebhook}, settings.notifications_webhook),
                theme = COALESCE(${theme}, settings.theme),
                updated_at = NOW()`;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  return POST(req);
}
