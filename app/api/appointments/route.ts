// app/api/appointments/route.ts
// CRUD for appointments (dev JSON-backed). Replace with Neon for prod.

import { NextResponse } from "next/server";
import { listByDate, upsert, remove } from "@/lib/appointments";
import type { Appointment } from "@/lib/types";
import { uid } from "@/lib/id";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || undefined;
  const items = await listByDate(date || undefined);
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Appointment>;
    if (!body) return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });

    const { title, date, start, durationMin, notes } = body;
    if (!title || !date || !start || !durationMin) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }
    const item: Appointment = {
      id: body.id || uid("appt"),
      title,
      date,
      start,
      durationMin: Number(durationMin),
      notes,
    };
    const saved = await upsert(item);
    return NextResponse.json({ ok: true, item: saved });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Failed to create" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as Partial<Appointment>;
    if (!body?.id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    const item: Appointment = {
      id: body.id,
      title: body.title || "Untitled",
      date: body.date || "",
      start: body.start || "00:00",
      durationMin: Number(body.durationMin || 30),
      notes: body.notes,
    };
    const saved = await upsert(item);
    return NextResponse.json({ ok: true, item: saved });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    await remove(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Failed to delete" }, { status: 500 });
  }
}
