// components/ChatWindow.tsx
// Displays messages from the Zustand store with special styling for ritual messages.

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAppStore } from "@/lib/store";
import { uid } from "@/lib/id";
import RitualButtons from "@/components/RitualButtons";
import EmotionCard from "@/components/EmotionCard";
import EmotionHeader from "@/components/EmotionHeader";
import { getEmotionDescriptor } from "@/lib/emotions";
import waveHand from "@/images/emojis/hands/wavehandright.png";
import sleepyEmoji from "@/images/emojis/sleepy.png";

export default function ChatWindow() {
  const { messages, saveMessage, urgentTodos, loadUrgentTodos, addMessage, setMessages, notificationsWebhook } = useAppStore();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [completedTimers, setCompletedTimers] = useState<Record<string, boolean>>({});
  const [saveStates, setSaveStates] = useState<Record<string, "idle" | "saving" | "saved" | "error">>({});
  const [questionInputs, setQuestionInputs] = useState<Record<string, string>>({});
  const [goodnightShown, setGoodnightShown] = useState<boolean>(false);
  const goodnightLockRef = useRef<boolean>(false);
  const todayISO = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);
  const [todayTasks, setTodayTasks] = useState<Array<{ title: string; start: string; durationMin?: number }> | null>(null);
  const [todayLoading, setTodayLoading] = useState(false);

  // Render-time dedup: only show the first goodnight card even if duplicates exist in history
  const renderMessages = useMemo(() => {
    // Determine index of the last goodnight card to prefer rendering the latest one
    let lastGoodnightIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      const mm: any = messages[i];
      if (mm?.metadata?.demo === 'goodnightCard') { lastGoodnightIdx = i; break; }
    }
    return messages.filter((mm: any, idx: number) => {
      if (mm?.metadata?.demo === 'goodnightCard' && lastGoodnightIdx !== -1) {
        return idx === lastGoodnightIdx; // keep only the latest
      }
      return true;
    });
  }, [messages]);

  // Inject a single goodnight card and persist it. Guard against duplicates.
  const showGoodnightCard = useMemo(() => {
    return () => {
      if (goodnightLockRef.current) return;
      goodnightLockRef.current = true; // reentrancy lock
      if (goodnightShown) return;
      // If already present in message list, set flag and exit
      const alreadyCard = messages.some((mm: any) => mm?.metadata?.demo === 'goodnightCard');
      if (alreadyCard) { setGoodnightShown(true); return; }
      const ts2 = Date.now();
      const idCard = uid('m');
      const metaCard: any = { demo: 'goodnightCard' };
      addMessage({ id: idCard, role: 'assistant', text: '', metadata: metaCard, timestamp: ts2 });
      fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: idCard, role: 'assistant', text: '', metadata: metaCard, timestamp: ts2, echo: false }),
      }).catch(() => {});
      setGoodnightShown(true);
      try { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); } catch {}
    };
  }, [goodnightShown, messages, addMessage]);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    // Prefer smooth scroll if user is near bottom; otherwise jump
    const el = containerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160; // px threshold
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: nearBottom ? "smooth" : "auto" });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // Ensure urgent todos are available when demo grid is shown in chat
  useEffect(() => {
    if (!urgentTodos || urgentTodos.length === 0) {
      try { loadUrgentTodos(); } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load today's appointments once so demo list pulls from in-app schedule
  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        setTodayLoading(true);
        const res = await fetch(`/api/appointments?date=${encodeURIComponent(todayISO)}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({} as any));
        if (ignore) return;
        const items: any[] = Array.isArray(data?.items) ? data.items : [];
        const mapped = items
          .slice()
          .sort((a, b) => String(a.start || '').localeCompare(String(b.start || '')))
          .map((a) => ({ title: String(a.title || '(untitled)'), start: String(a.start || '00:00'), durationMin: typeof a.durationMin === 'number' ? a.durationMin : undefined }));
        setTodayTasks(mapped);
      } catch {
        if (!ignore) setTodayTasks([]);
      } finally {
        if (!ignore) setTodayLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [todayISO]);

  // Global 1s ticker to update countdowns (supports legacy countdown60 and new generic countdown)
  const hasCountdown = useMemo(
    () => messages.some((m: any) => m?.metadata?.demo === "countdown60" || m?.metadata?.demo === "countdown"),
    [messages]
  );
  useEffect(() => {
    if (!hasCountdown) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [hasCountdown]);

  function renderDemoContent(m: any) {
    const meta = m?.metadata as any;
    if (!meta || !meta.demo) return null;
    if (meta.demo === "wakeupCard") {
      const welcome: string = String(meta.welcome || "Morning spark.");
      const quest: string = String(meta.quest || "Set one clear move for today.");
      const quote: string = String(meta.quote || "Breathe in and take the first step.");
      const joy = getEmotionDescriptor("joyful");
      return (
        <section aria-label="Wake up" className="rounded-xl overflow-hidden shadow-elevated">
          <div className="relative p-5 bg-gradient-to-b from-[#0d2f4d] via-[#123a60] to-[#0b2237] text-white space-y-4">
            {joy ? (
              <div className="flex justify-center">
                <div className="relative h-24 w-24 chuckle-motion">
                  <Image
                    src={joy.image}
                    alt="Joyful Surge emoji"
                    fill
                    sizes="96px"
                    className="object-contain drop-shadow-lg"
                    priority={false}
                  />
                  <div className="absolute bottom-[-4px] left-[-10px] h-12 w-12 wave-motion">
                    <Image
                      src={waveHand}
                      alt="Waving hand"
                      fill
                      sizes="48px"
                      className="object-contain drop-shadow-lg"
                      priority={false}
                    />
                  </div>
                </div>
              </div>
            ) : null}
            <div className="text-center space-y-2">
              <div className="text-white font-semibold text-lg">{welcome}</div>
              <div className="text-white/85 text-sm">{quest}</div>
              <div className="mt-2 text-[13px] text-yellow-200/90 italic">“{quote}”</div>
            </div>
          </div>
        </section>
      );
    }
    if (meta.demo === "listSection") {
      const title: string = String(meta.title || "List");
      const sections: Array<{ header?: string; items: string[] }> = Array.isArray(meta.sections) ? meta.sections : [];
      const totalItems = sections.reduce((acc, s) => acc + (Array.isArray(s.items) ? s.items.length : 0), 0);
      const impulse: string | undefined = typeof meta.currentImpulse === 'string' && meta.currentImpulse.trim() ? meta.currentImpulse.trim() : undefined;
      return (
        <section aria-label={title} className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)]/80 shadow-subtle overflow-hidden">
          <header className="px-3 py-2 border-b border-[var(--border)]">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{title}</div>
              <div className="text-xs text-[var(--fg)]/60">{totalItems} items</div>
            </div>
            {impulse ? (
              <div className="mt-1 text-xs text-[var(--fg)]/70">
                <span className="text-[var(--accent)]/90">Impulse:</span> {impulse}
              </div>
            ) : null}
          </header>
          <div className="divide-y divide-[var(--border)]">
            {sections.map((sec, sIdx) => {
              const hdr = (sec.header || '').toString();
              const up = hdr.toUpperCase();
              const isOrange = up === 'CONSEQUENCES' || up === 'BETTER ALTERNATIVES';
              return (
                <div key={sIdx}>
                  {sec.header ? (
                    <div className={
                      "px-3 py-1.5 text-[11px] uppercase tracking-wide bg-[var(--surface-2)]/30 " +
                      (isOrange ? "text-amber-300" : "text-[var(--fg)]/60")
                    }>
                      {up}
                    </div>
                  ) : null}
                  <ul className="divide-y divide-[var(--border)]">
                    {(sec.items || []).map((line: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 px-3 py-2">
                        <span className="inline-flex h-3.5 w-3.5 rounded-sm bg-gray-500/30 mt-0.5" />
                        <span className="text-sm text-[var(--fg)]">{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            {/* Action footer */}
            <div className="px-3 py-2">
              <button
                type="button"
                className="px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--accent)]/20 text-[var(--accent)] hover:bg-[var(--accent)]/30 text-sm"
                onClick={async () => {
                  // Inject a running 5-minute countdown that posts to notifications webhook on completion
                  const started = Date.now();
                  const metaTimer: any = {
                    demo: 'countdown',
                    seconds: 300,
                    startedAt: started,
                    label: '5-minute evaluation',
                    next: { type: 'webhookPost', payload: { text: 'How do you feel about your impulse now?' } },
                  };
                  const idTimer = `m_${started}_eval5`;
                  addMessage({ id: idTimer, role: 'assistant', text: '', metadata: metaTimer, timestamp: started });
                  try {
                    await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: idTimer, role: 'assistant', text: '', metadata: metaTimer, timestamp: started, echo: false }) });
                  } catch {}
                }}
              >
                I need to evaluate.
              </button>
            </div>
          </div>
        </section>
      );
    }
    if (meta.demo === "enjoyDayCard") {
      return (
        <section aria-label="Enjoy your day" className="rounded-xl overflow-hidden shadow-elevated">
          <div className="relative p-5 bg-[#0a2015] text-white">
            <div className="flex items-start gap-3">
              <div className="shrink-0 text-emerald-200">
                {/* Spark icon */}
                <svg width="44" height="44" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 2l2.09 6.26L20 10l-5.45 3.97L15.82 20 12 16.9 8.18 20l1.27-6.03L4 10l5.91-1.74L12 2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-white font-semibold text-lg">Enjoy your day!</div>
                <div className="text-white/80 text-sm">I’ll be here when you need me.</div>
              </div>
            </div>
          </div>
        </section>
      );
    }
    if (meta.demo === "urgentGrid") {
      // pull from store
      const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
      const items = (urgentTodos || [])
        .slice()
        // Hide completed items in the urgent grid
        .filter((t: any) => !t.done)
        .sort((a: any, b: any) => (a.done === b.done ? 0 : a.done ? 1 : -1) || (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9))
        .map((t: any) => ({ title: t.title, priority: t.priority }));
      const chip = (p: string) => {
        const base = "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] leading-4 font-medium";
        const map: Record<string, string> = {
          high: "bg-red-500/20 text-red-300 border border-red-500/30",
          medium: "bg-amber-500/20 text-amber-200 border border-amber-500/30",
          low: "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30",
        };
        return <span className={`${base} ${map[p] || "bg-gray-500/20 text-gray-200 border border-gray-500/30"}`}>{p}</span>;
      };
      return (
        <section aria-label="Urgent todos" className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)]/80 shadow-subtle overflow-hidden">
          <header className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[var(--accent)]/20 text-[var(--accent)]">
                {/* exclamation icon */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.72-1.36 3.485 0l6.518 11.6c.75 1.335-.223 3.001-1.742 3.001H3.48c-1.52 0-2.492-1.666-1.742-3.002l6.519-11.6zM10 13.5a1 1 0 100 2 1 1 0 000-2zm1-6.5a1 1 0 10-2 0v4a1 1 0 102 0V7z" clipRule="evenodd"/></svg>
              </span>
              <div className="text-sm font-medium">Urgent Todos</div>
            </div>
            <div className="text-xs text-[var(--fg)]/60 flex items-center gap-3">
              <span>{items.length} items</span>
              <Link href="/urgent" className="underline text-[var(--fg)]/70 hover:text-[var(--fg)]">Open</Link>
            </div>
          </header>
          <div className="grid grid-cols-[1fr_auto] bg-[var(--surface-2)]/30 text-[11px] uppercase tracking-wide text-[var(--fg)]/60">
            <div className="px-3 py-2">Name</div>
            <div className="px-3 py-2">Priority</div>
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {items.map((it, idx) => (
              <li key={idx} className="grid grid-cols-[1fr_auto] items-center">
                <div className={"px-3 py-2 truncate " + (it.priority === "high" ? "text-red-400" : "text-[var(--accent)]")}>
                  {it.title}
                </div>
                <div className="px-3 py-2">{chip(it.priority)}</div>
              </li>
            ))}
          </ul>
        </section>
      );
    }
    if (meta.demo === "winddownIntro") {
      return (
        <section aria-label="Winddown Intro" className="rounded-xl overflow-hidden shadow-elevated">
          <div className="relative p-4 md:p-5 bg-gradient-to-b from-[#3a1010] via-[#2b0b0b] to-[#1c0606]">
            <div className="flex items-start gap-3">
              <div className="shrink-0 text-red-200">
                {/* Notification Bell Icon */}
                <svg width="44" height="44" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 2a6 6 0 00-6 6v2.586l-.707.707A1 1 0 006 14h12a1 1 0 00.707-1.707L18 10.586V8a6 6 0 00-6-6z"></path>
                  <path d="M9 16a3 3 0 006 0H9z"></path>
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-white font-semibold">It's time to start your windown.</div>
                <div className="text-white/85 text-sm">Shut down blue lights, and take sleeping supplements.</div>
              </div>
            </div>
            {m.buttons && m.buttons.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <RitualButtons
                  ritualId={m.ritualId}
                  buttons={m.buttons}
                  onActionStart={() => {
                    // Remove buttons for this message only (prevents double rendering anywhere)
                    setMessages(
                      messages.map((mm) => (mm.id === m.id ? { ...mm, buttons: [] } : mm))
                    );
                  }}
                />
              </div>
            ) : null}
          </div>
        </section>
      );
    }
    if (meta.demo === "goodnightCard") {
      return (
        <section aria-label="Good night" className="rounded-xl overflow-hidden shadow-elevated">
          <div className="relative p-5 bg-gradient-to-b from-[#0d1d3a] via-[#0b1730] to-[#071022] text-white space-y-4">
            <div className="flex justify-center">
              <div className="relative h-24 w-24">
                <div className="absolute inset-0 chuckle-motion">
                  <Image
                    src={sleepyEmoji}
                    alt="Sleepy emoji"
                    fill
                    sizes="96px"
                    className="object-contain drop-shadow-lg"
                    priority={false}
                  />
                </div>
                <span
                  className="absolute text-lg text-blue-200 sleepy-z"
                  style={{ left: "50%", transform: "translate(-50%, 0)", top: "0.25rem" }}
                >
                  Z
                </span>
                <span
                  className="absolute text-base text-blue-100 sleepy-z"
                  style={{ left: "50%", transform: "translate(-50%, -0.75rem)", top: "-0.75rem", animationDelay: "420ms" }}
                >
                  Z
                </span>
                <span
                  className="absolute text-sm text-blue-100 sleepy-z"
                  style={{ left: "50%", transform: "translate(-50%, -1.5rem)", top: "-1.5rem", animationDelay: "840ms" }}
                >
                  Z
                </span>
              </div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-white font-semibold text-lg">Good night</div>
              <div className="text-white/85 text-sm">
                You finished your winddown. Keep lights low, keep phone away, and rest well.
              </div>
              <div className="mt-2 text-[13px] text-blue-200/90 italic">“I’m here in the morning. Sleep well.”</div>
            </div>
          </div>
        </section>
      );
    }
    if (meta.demo === "todayList") {
      const items = todayTasks ?? [];
      return (
        <section aria-label="Today's tasks" className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)]/80 shadow-subtle overflow-hidden">
          <header className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-gray-500/20 text-gray-300">
                {/* checklist icon */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5"><path d="M16.704 5.29a1 1 0 00-1.408-1.418l-6.3 6.25-2.292-2.276a1 1 0 00-1.416 1.414l3 2.98a1 1 0 001.408 0l7.008-6.95z"/></svg>
              </span>
              <div className="text-sm font-medium">Today's Tasks</div>
            </div>
            <div className="text-xs text-[var(--fg)]/60 flex items-center gap-3">
              <span>{todayLoading ? 'Loading…' : `${items.length} items`}</span>
              <Link href={`/schedule/${todayISO}`} className="underline text-[var(--fg)]/70 hover:text-[var(--fg)]">Open</Link>
            </div>
          </header>
          {todayLoading ? (
            <div className="px-3 py-3 text-sm text-[var(--fg)]/60">Loading…</div>
          ) : items.length === 0 ? (
            <div className="px-3 py-3 text-sm text-[var(--fg)]/60">No tasks scheduled today.</div>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {items.map((t, idx) => (
                <li key={idx} className="flex items-center justify-between px-3 py-2">
                  <Link href={`/schedule/${todayISO}`} className="flex items-center gap-3 min-w-0 group">
                    <span className="inline-flex h-3.5 w-3.5 rounded-sm bg-gray-500/30 group-hover:bg-gray-400/40" />
                    <span className="truncate group-hover:underline">{t.title}</span>
                  </Link>
                  <Link href={`/schedule/${todayISO}`} className="text-[11px] text-[var(--fg)]/50 hover:underline">{t.start}{typeof t.durationMin === 'number' ? ` · ${t.durationMin}m` : ''}</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      );
    }
    if (meta.demo === "countdown60" || meta.demo === "countdown") {
      // Generic countdown renderer
      const raw = (meta as any).startedAt;
      const parsed = typeof raw === "number" ? raw : (typeof raw === "string" ? parseInt(raw, 10) : undefined);
      const startedAt: number | null = Number.isFinite(parsed) ? (parsed as number) : null;
      const total = Math.max(1, Number((meta as any).seconds ?? (meta.demo === "countdown60" ? 60 : 60)));
      const label: string = String((meta as any).label || (total === 60 ? "1-minute timer" : `${Math.ceil(total/60)}-minute timer`));
      const elapsed = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
      const left = startedAt ? Math.max(0, total - elapsed) : total;
      const pct = Math.max(0, Math.min(100, (left / total) * 100));

      // Emit a one-time completion message when timer hits 0
      if (startedAt && left === 0 && !completedTimers[m.id]) {
        setCompletedTimers((s) => ({ ...s, [m.id]: true }));
        // Add a small completion message to chat and persist
        const doneId = `m_${Date.now()}_done`;
        addMessage({ id: doneId, role: "assistant", text: `Timer complete: ${label}`, timestamp: Date.now() });
        fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: doneId, role: "assistant", text: `Timer complete: ${label}`, timestamp: Date.now(), echo: false }),
        }).catch(() => {});

        // If a follow-up is specified, inject it now
        const nextCfg = (meta as any)?.next;
        if (nextCfg && typeof nextCfg === 'object') {
          if (nextCfg.type === 'questionSave') {
            const qId = `m_${Date.now()}_q`;
            const qMeta = { demo: 'questionSave', prompt: String(nextCfg.prompt || 'What is on your mind right now?') } as const;
            const ts = Date.now();
            addMessage({ id: qId, role: 'assistant', text: '', metadata: qMeta, timestamp: ts });
            fetch('/api/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: qId, role: 'assistant', text: '', metadata: qMeta, timestamp: ts, echo: false }),
            }).catch(() => {});
          } else if (nextCfg.type === 'webhookPost') {
            // Post a notification payload to the configured notifications webhook
            const url = String(notificationsWebhook || '').trim();
            const payload: any = (nextCfg.payload && typeof nextCfg.payload === 'object') ? nextCfg.payload : { text: 'How do you feel about your impulse now?' };
            if (url) {
              try {
                fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => {});
                const ackId2 = `m_${Date.now()}_notify`;
                addMessage({ id: ackId2, role: 'assistant', text: 'Evaluation ping sent.', timestamp: Date.now() });
                fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: ackId2, role: 'assistant', text: 'Evaluation ping sent.', timestamp: Date.now(), echo: false }) }).catch(() => {});
              } catch {}
            } else {
              const warnId = `m_${Date.now()}_nowebhook`;
              addMessage({ id: warnId, role: 'assistant', text: 'No notifications webhook configured.', timestamp: Date.now() });
              fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: warnId, role: 'assistant', text: 'No notifications webhook configured.', timestamp: Date.now(), echo: false }) }).catch(() => {});
            }
          }
        }
      }
      return (
        <section aria-label="Countdown" className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)]/80 shadow-subtle overflow-hidden">
          <header className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-gray-500/20 text-gray-300">
                {/* timer icon */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm.75 4a.75.75 0 00-1.5 0v4c0 .199.079.39.22.53l2.5 2.5a.75.75 0 101.06-1.06l-2.28-2.28V6z"/></svg>
              </span>
              <div className="text-sm font-medium">{label}</div>
            </div>
            <div className="text-xs text-[var(--fg)]/60">{startedAt ? `${left}s left` : "Not started"}</div>
          </header>
          <div className="p-3">
            <div className="h-2 w-full rounded bg-[var(--surface-2)]/40 overflow-hidden">
              <div className="h-full bg-[var(--accent)]" style={{ width: `${pct}%`, transition: "width 300ms linear" }} />
            </div>
            {/* Controls and status */}
            <div className="mt-2 flex items-center justify-between gap-2 text-xs">
              {!startedAt ? (
                <button
                  type="button"
                  className="px-2 py-1 rounded-md border border-[var(--border)] bg-gray-700 text-white hover:bg-gray-600"
                  onClick={async () => {
                    // Start by updating this existing countdown message in place with startedAt
                    const ts = Date.now();
                    const originalNext = (meta as any)?.next;
                    const newMeta: any = { demo: "countdown", seconds: total, startedAt: ts, label };
                    if (originalNext && typeof originalNext === 'object') newMeta.next = originalNext;
                    // Update store
                    setMessages(
                      messages.map((mm) => (mm.id === m.id ? { ...mm, metadata: newMeta } : mm))
                    );
                    // Persist via PUT
                    try {
                      await fetch("/api/messages", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: m.id, metadata: newMeta }),
                      });
                    } catch {}
                  }}
                >
                  Start
                </button>
              ) : left === 0 ? (
                <div className="inline-flex items-center gap-1 text-emerald-400">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M16.704 5.29a1 1 0 00-1.408-1.418l-6.3 6.25-2.292-2.276a1 1 0 00-1.416 1.414l3 2.98a1 1 0 001.408 0l7.008-6.95z" clipRule="evenodd"/></svg>
                  Completed
                </div>
              ) : (
                <div className="text-[var(--fg)]/60">Running…</div>
              )}
            </div>
          </div>
        </section>
      );
    }
    if (meta.demo === "questionInput") {
      const val = questionInputs[m.id] ?? "";
      return (
        <section aria-label="Question" className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)]/80 shadow-subtle overflow-hidden">
          <header className="px-3 py-2 border-b border-[var(--border)] text-sm font-medium">Ask a question</header>
          <div className="p-3 flex items-center gap-2">
            <input
              value={val}
              onChange={(e) => setQuestionInputs((s) => ({ ...s, [m.id]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const text = (questionInputs[m.id] ?? "").trim();
                  if (!text) return;
                  addMessage({ id: `m_${Date.now()}`, role: "user", text, timestamp: Date.now() });
                  setQuestionInputs((s) => ({ ...s, [m.id]: "" }));
                  setToast("Message sent.");
                  window.setTimeout(() => setToast(null), 1500);
                }
              }}
              className="flex-1 border border-[var(--border)] rounded-md px-3 py-2 text-sm bg-[var(--surface-1)] text-[var(--fg)] placeholder-[var(--fg)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              placeholder="Type your question and press Enter"
              aria-label="Question"
            />
            <button
              type="button"
              onClick={() => {
                const text = (questionInputs[m.id] ?? "").trim();
                if (!text) return;
                addMessage({ id: `m_${Date.now()}`, role: "user", text, timestamp: Date.now() });
                setQuestionInputs((s) => ({ ...s, [m.id]: "" }));
                setToast("Message sent.");
                window.setTimeout(() => setToast(null), 1500);
              }}
              className="px-3 py-2 rounded-md border border-[var(--border)] bg-gray-700 text-white hover:bg-gray-600 text-sm"
            >
              Send
            </button>
          </div>
        </section>
      );
    }
    if (meta.demo === "questionSave") {
      const val = questionInputs[m.id] ?? "";
      const prompt: string = String((meta as any).prompt || "What is on your mind right now?");
      const st = saveStates[m.id] ?? "idle";
      return (
        <section aria-label="Question Save" className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)]/80 shadow-subtle overflow-hidden">
          <header className="px-3 py-2 border-b border-[var(--border)] text-sm font-medium">{prompt}</header>
          {st !== "saved" ? (
            <div className="p-3 flex items-center gap-2">
              <input
                value={val}
                onChange={(e) => setQuestionInputs((s) => ({ ...s, [m.id]: e.target.value }))}
                onKeyDown={(e) => { e.stopPropagation(); }}
                className="flex-1 border border-[var(--border)] rounded-md px-3 py-2 text-sm bg-[var(--surface-1)] text-[var(--fg)] placeholder-[var(--fg)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="Type your answer"
                aria-label="Mind snapshot answer"
              />
              <button
                type="button"
                onClick={async () => {
                const text = (questionInputs[m.id] ?? "").trim();
                if (!text) return;
                try {
                  setSaveStates((s) => ({ ...s, [m.id]: "saving" }));
                  let saveTo: string = String((meta as any).saveTo || "/api/mind");
                  // If this is a winddown session question but saveTo is missing, route to winddown/answer
                  if (!('saveTo' in (meta as any)) && (meta as any).sessionId) {
                    saveTo = "/api/winddown/answer";
                  }
                  const payload: any = { id: `mind_${Date.now()}`, text, createdAt: Date.now() };
                  if ((meta as any).sessionId) payload.sessionId = (meta as any).sessionId;
                  if ((meta as any).question) payload.question = (meta as any).question;
                  const res = await fetch(saveTo, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  });
                  const data = await res.json().catch(() => ({} as any));
                  if (!data?.ok) throw new Error(data?.error || "Save failed");
                  setSaveStates((s) => ({ ...s, [m.id]: "saved" }));
                  setToast("Saved.");

                  // If server returned a generated assistant message, inject it now
                  if (data?.message && typeof data.message === 'object') {
                    const gen = data.message;
                    const exists = messages.some((mm: any) => mm.id === gen.id);
                    if (!exists) {
                      addMessage(gen);
                      try {
                        await fetch('/api/messages', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ ...gen, echo: false }),
                        });
                      } catch {}
                    }
                  }

                  // If server indicates final step, show goodnight card now
                  if (data?.goodnight === true) {
                    if (data?.message && data.message?.metadata?.demo === 'goodnightCard') {
                      // If any goodnight card already exists, skip injecting another
                      const existsAny = messages.some((mm: any) => mm?.metadata?.demo === 'goodnightCard');
                      if (!existsAny) {
                        // Inject server-created message without re-posting
                        const existsSameId = messages.some((mm: any) => mm.id === data.message.id);
                        if (!existsSameId) {
                          addMessage(data.message);
                        }
                      }
                      // Lock further client-side injections for this run (whether or not we injected)
                      goodnightLockRef.current = true;
                      setGoodnightShown(true);
                      try { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); } catch {}
                    } else {
                      showGoodnightCard();
                    }
                    // Do not process any further chaining when goodnight has been finalized
                    return;
                  }

                  // If there is a next question, chain it now
                  const next = (meta as any)?.next;
                  if (next && typeof next === 'object' && next.type === 'questionSave') {
                    const qId = `m_${Date.now()}_q`;
                    let inheritedSaveTo = String(next.saveTo || saveTo);
                    if (!('saveTo' in next) && ((meta as any).sessionId || next.sessionId)) {
                      inheritedSaveTo = "/api/winddown/answer";
                    }
                    const nextMeta: any = { demo: 'questionSave', prompt: String(next.prompt || ''), saveTo: inheritedSaveTo };
                    if ((meta as any).sessionId) nextMeta.sessionId = (meta as any).sessionId;
                    if (next.sessionId) nextMeta.sessionId = next.sessionId;
                    if (next.question) nextMeta.question = next.question;
                    if (next.next) nextMeta.next = next.next;
                    const qTs = Date.now();
                    addMessage({ id: qId, role: 'assistant', text: '', metadata: nextMeta, timestamp: qTs });
                    fetch('/api/messages', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id: qId, role: 'assistant', text: '', metadata: nextMeta, timestamp: qTs, echo: false }),
                    }).catch(() => {});
                  } else if (next && typeof next === 'object' && next.type === 'winddownIntro') {
                    try {
                      const res = await fetch('/api/rituals/trigger', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ritualId: 'winddown' }),
                      });
                      const data = await res.json().catch(() => ({} as any));
                      const list = Array.isArray(data?.messages) ? data.messages : [];
                      for (const mm of list) {
                        addMessage(mm);
                        fetch('/api/messages', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ ...mm, echo: false }),
                        }).catch(() => {});
                      }
                    } catch {}
                  } else if (next && typeof next === 'object' && next.type === 'goodnight') {
                    showGoodnightCard();
                  } else if ((meta as any)?.question === 'one_thing_learned' || String((meta as any)?.prompt || '').toLowerCase().includes("one thing you have learned")) {
                    // Fallback: if final question saved but next isn't provided, still show the goodnight card
                    window.setTimeout(() => { showGoodnightCard(); }, 50);
                  }
                } catch (e) {
                  setSaveStates((s) => ({ ...s, [m.id]: "error" }));
                  setToast("Save failed.");
                } finally {
                  setQuestionInputs((s) => ({ ...s, [m.id]: "" }));
                  window.setTimeout(() => setToast(null), 1600);
                }
              }}
              disabled={st === "saving"}
              className={
                "px-3 py-2 rounded-md border text-sm border-[var(--border)] bg-[var(--accent)]/20 text-[var(--accent)] hover:bg-[var(--accent)]/30 disabled:opacity-60"
              }
            >
              {st === "saving" ? "Saving…" : "Save"}
            </button>
          </div>
          ) : null}
          {st === "saved" ? (
            <div className="px-3 pb-3 text-xs text-emerald-400 inline-flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M16.704 5.29a1 1 0 00-1.408-1.418l-6.3 6.25-2.292-2.276a1 1 0 00-1.416 1.414l3 2.98a1 1 0 001.408 0l7.008-6.95z" clipRule="evenodd"/></svg>
              Saved
            </div>
          ) : st === "error" ? (
            <div className="px-3 pb-3 text-xs text-red-400">Save failed. Please try again.</div>
          ) : null}
        </section>
      );
    }
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-3 h-full min-h-0 overflow-y-auto pl-2 pr-2 pt-2 pb-14 md:pb-0 bg-transparent text-[var(--fg)] leading-6"
      aria-live="polite"
    >
      {renderMessages.map((m) => {
        const isUser = m.role === "user";
        const isRitual = m.role === "ritual";
        const hasDemo = (m as any)?.metadata?.demo;
        const metaEmotionId = typeof (m.metadata as any)?.emotionId === "string" ? (m.metadata as any).emotionId : undefined;
        const metaDemo = (m.metadata as any)?.demo;
        const emotionDescriptor = getEmotionDescriptor(m.emotionId ?? metaEmotionId);
        const hasEmotion = Boolean(emotionDescriptor);
        const isEmotionCard = hasEmotion && metaDemo === "emotionCard";
        const bubbleBase = "inline-block px-4 py-2.5 rounded-lg text-[0.95rem] max-w-[80%] shadow-subtle";
        const bubbleRole = isUser
          ? "bg-gray-700 text-white"
          : isRitual
          ? "bg-[var(--surface-1)] text-[var(--fg)] border border-[var(--border)]"
          : "bg-[var(--surface-1)] text-[var(--fg)] border border-[var(--border)]";
        const bubbleCls = hasDemo || hasEmotion
          ? "w-full max-w-none p-0 bg-transparent shadow-none border-0"
          : `${bubbleBase} ${bubbleRole}`;
        const textCls = "whitespace-pre-wrap break-normal";
        const textContent = typeof m.text === "string" ? m.text.trim() : "";
        const shouldShowText = hasEmotion
          ? isEmotionCard
            ? Boolean(textContent && (!emotionDescriptor || textContent.toLowerCase() !== emotionDescriptor.prompt.toLowerCase()))
            : Boolean(textContent)
          : Boolean(textContent);
        return (
          <div key={m.id} className={"flex " + (isUser ? "justify-end" : "justify-start")}>
            <div className={"flex flex-col items-" + (isUser ? "end" : "start") + " gap-1.5" + (hasDemo || hasEmotion ? " w-full" : "") }>
              <div
                className={bubbleCls}
                onClick={() => setActiveId((prev) => (prev === m.id ? null : m.id))}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setActiveId((prev) => (prev === m.id ? null : m.id));
                  }
                }}
                aria-label="Message"
              >
                {hasEmotion ? (
                  <div className="w-full">
                    {isEmotionCard ? (
                      <EmotionCard emotion={emotionDescriptor!} />
                    ) : (
                      <EmotionHeader emotion={emotionDescriptor!} />
                    )}
                    {shouldShowText ? <div className={`${textCls} mt-3`}>{textContent}</div> : null}
                  </div>
                ) : renderDemoContent(m) ?? (shouldShowText ? <div className={textCls}>{textContent}</div> : null)}
                {isRitual && m.buttons && m.buttons.length > 0 && m?.metadata?.demo !== 'winddownIntro' && (
                  <div className="mt-2">
                    <RitualButtons ritualId={m.ritualId} buttons={m.buttons} />
                  </div>
                )}
              </div>
              <div className={"flex " + (isUser ? "justify-end" : "justify-start")}>
                <button
                  type="button"
                  aria-label={`Save message ${m.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    saveMessage(m.id);
                    setToast("Message saved.");
                    setActiveId(null);
                    window.setTimeout(() => setToast(null), 1600);
                  }}
                  className={
                    "mt-0.5 inline-flex items-center justify-center h-7 w-7 rounded-full border border-[var(--border)] bg-[var(--surface-1)] text-[var(--fg)]/70 hover:bg-[var(--surface-2)] hover:text-[var(--fg)] transition-all duration-200 " +
                    (activeId === m.id ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none")
                  }
                >
                  {/* Heart icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.188 3 13.013 3 10.5 3 8.015 5.015 6 7.5 6A4.5 4.5 0 0112 8.03 4.5 4.5 0 0116.5 6C18.985 6 21 8.015 21 10.5c0 2.513-1.688 4.688-3.989 6.007a25.18 25.18 0 01-4.244 3.17 15.247 15.247 0 01-.383.218l-.022.012-.007.003a.75.75 0 01-.666 0z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm shadow-elevated">
          {toast}
        </div>
      )}
    </div>
  );
}



