// components/RitualsMenu.tsx
// Dropdown for ritual-related actions (e.g., trigger a ritual webhook)

"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { uid } from "@/lib/id";

type Props = { label?: string; up?: boolean };

export default function RitualsMenu({ label = "Rituals", up = false }: Props) {
  const [open, setOpen] = useState(false);
  const { addMessage } = useAppStore();

  async function runPlansRitual() {
    try {
      const res = await fetch("/api/rituals/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ritualId: "plans" }),
      });
      const data = await res.json().catch(() => ({} as any));
      const list = Array.isArray(data?.messages) ? data.messages : [];
      for (const m of list) {
        addMessage(m);
      }
    } catch (e) {
      addMessage({ id: uid("m"), role: "assistant", text: "Plans ritual failed.", timestamp: Date.now() });
    } finally {
      setOpen(false);
    }
  }

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        className="inline-flex h-9 items-center gap-2 rounded-md px-3 py-0 border border-[var(--border)] bg-[var(--surface-1)] text-sm leading-none text-[var(--fg)]/90 hover:bg-[var(--surface-2)] shadow-subtle"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 align-middle">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 0 1 1.08 1.04l-4.25 4.25a.75.75 0 0 1-1.06 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Rituals menu"
          className={
            "absolute right-0 w-56 rounded-md border border-[var(--border)] bg-[var(--surface-1)] shadow-elevated p-1 z-20 " +
            (up ? "bottom-full mb-2" : "mt-2")
          }
        >
          <button
            className="w-full text-left px-3 py-2 rounded-md hover:bg-[var(--surface-2)]"
            onClick={async () => {
              // Trigger Impulse Control v1
              try {
                const res = await fetch("/api/rituals/trigger", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ritualId: "impulse_control_v1" }),
                });
                const data = await res.json().catch(() => ({} as any));
                const list = Array.isArray(data?.messages) ? data.messages : [];
                for (const m of list) {
                  addMessage(m);
                  try {
                    await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...m, echo: false }) });
                  } catch {}
                }
              } catch (e) {
                addMessage({ id: uid("m"), role: "assistant", text: "Impulse Control v1 failed.", timestamp: Date.now() });
              } finally {
                setOpen(false);
              }
            }}
            role="menuitem"
          >
            Impulse Control v1
          </button>
          <button
            className="w-full text-left px-3 py-2 rounded-md hover:bg-[var(--surface-2)]"
            onClick={async () => {
              // OS Control V1 (Overstimulation control)
              const now = Date.now();
              const idIntro = uid("m");
              const idTimer = uid("m");
              addMessage({ id: idIntro, role: "assistant", text: "It is time to take a break.", timestamp: now });
              // Create a paused 3-minute countdown (no startedAt), and specify a follow-up question to show on completion
              const timerMeta = { demo: "countdown", seconds: 180, label: "3-minute timer", next: { type: "questionSave", prompt: "What is on your mind right now?" } } as const;
              addMessage({ id: idTimer, role: "assistant", text: "", metadata: timerMeta, timestamp: now });
              // Persist both messages immediately
              try {
                await fetch("/api/messages", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: idIntro, role: "assistant", text: "It is time to take a break.", timestamp: now, echo: false }),
                });
              } catch {}
              try {
                await fetch("/api/messages", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: idTimer, role: "assistant", text: "", timestamp: now, metadata: timerMeta, echo: false }),
                });
              } catch {}
              setOpen(false);
            }}
            role="menuitem"
          >
            OS Control V1
          </button>
          <button
            className="w-full text-left px-3 py-2 rounded-md hover:bg-[var(--surface-2)]"
            onClick={async () => {
              // Start Evening Winddown chain
              try {
                const res = await fetch("/api/rituals/trigger", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ritualId: "winddown" }),
                });
                const data = await res.json().catch(() => ({} as any));
                const list = Array.isArray(data?.messages) ? data.messages : [];
                for (const m of list) {
                  addMessage(m);
                  try {
                    await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...m, echo: false }) });
                  } catch {}
                }
              } catch (e) {
                addMessage({ id: uid("m"), role: "assistant", text: "Winddown ritual failed.", timestamp: Date.now() });
              } finally {
                setOpen(false);
              }
            }}
            role="menuitem"
          >
            Evening Winddown
          </button>
          <button
            className="w-full text-left px-3 py-2 rounded-md hover:bg-[var(--surface-2)]"
            onClick={runPlansRitual}
            role="menuitem"
          >
            Run Plans ritual
          </button>
          <button
            className="w-full text-left px-3 py-2 rounded-md hover:bg-[var(--surface-2)]"
            onClick={async () => {
              try {
                const res = await fetch("/api/rituals/trigger", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ritualId: "wakeup_v1" }),
                });
                const data = await res.json().catch(() => ({} as any));
                const list = Array.isArray(data?.messages) ? data.messages : [];
                for (const m of list) {
                  addMessage(m);
                  try {
                    await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...m, echo: false }) });
                  } catch {}
                }
              } catch (e) {
                addMessage({ id: uid("m"), role: "assistant", text: "WakeUp v1 ritual failed.", timestamp: Date.now() });
              } finally {
                setOpen(false);
              }
            }}
            role="menuitem"
          >
            WakeUp v1
          </button>
        </div>
      )}
    </div>
  );
}
