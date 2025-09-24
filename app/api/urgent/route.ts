// app/api/urgent/route.ts
// CRUD for urgent todos (dev JSON-backed). Replace with Neon for prod.

import { NextResponse } from "next/server";
import type { UrgentTodo } from "@/lib/types";
import { uid } from "@/lib/id";
import { readUrgent, upsertUrgent, removeUrgent } from "@/lib/urgent";

export const runtime = "nodejs";

export async function GET() {
  const items = await readUrgent();
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<UrgentTodo>;
    if (!body) return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });

    const now = Date.now();
    const item: UrgentTodo = {
      id: body.id || uid("todo"),
      title: body.title || "Untitled",
      priority: body.priority || "high",
      done: !!body.done,
      dueAt: body.dueAt,
      notes: body.notes,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      createdAt: body.createdAt || now,
      updatedAt: now,
    };
    const saved = await upsertUrgent(item);
    return NextResponse.json({ ok: true, item: saved });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Failed to create/update" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    await removeUrgent(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Failed to delete" }, { status: 500 });
  }
}
