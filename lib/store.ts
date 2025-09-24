/**
 * lib/store.ts
 * Zustand store for PSA: ephemeral messages (max 100), rituals, saved messages, and tone.
 */

import { create } from "zustand";
import type { Message, RitualConfig, SavedMessage, Tone, Theme, Settings, UrgentTodo } from "@/lib/types";

// Small dev mocks so UI isn't empty on first load
const now = Date.now();
const devMessages: Message[] = [
  { id: "m1", role: "assistant", text: "Welcome to PSA. Type /start morning or say hi!", timestamp: now - 5000 },
  { id: "m2", role: "user", text: "hi", timestamp: now - 4000 },
  { id: "m3", role: "ritual", text: "Morning check-in: How are you feeling?", buttons: ["Good", "Meh", "Low"], ritualId: "morning", timestamp: now - 3000 },
];

const devRituals: RitualConfig[] = [
  {
    id: "morning",
    name: "Morning Check-in",
    webhook: "",
    trigger: { type: "schedule", time: "08:00", repeat: "daily" },
    buttons: ["Good", "Meh", "Low"],
    active: true,
  },
  {
    id: "evening",
    name: "Evening Wind-down",
    webhook: "",
    trigger: { type: "chat", chatKeyword: "/evening" },
    buttons: ["Done", "Snooze"],
    active: true,
  },
  {
    id: "plans",
    name: "Plans Ritual",
    webhook: "",
    trigger: { type: "chat", chatKeyword: "/plans" },
    buttons: [],
    active: true,
  },
  {
    id: "impulse_control_v1",
    name: "Impulse Control v1",
    webhook: "",
    trigger: { type: "chat", chatKeyword: "/impulse" },
    buttons: [],
    active: true,
  },
];

const devSaved: SavedMessage[] = [
  { id: "s1", text: "Breathing ritual felt great.", createdAt: now - 10000 },
];

export type AppState = {
  messages: Message[];
  rituals: RitualConfig[];
  saved: SavedMessage[];
  tone: Tone;
  fallbackWebhook: string; // optional fallback n8n webhook URL
  theme: Theme;
  notificationsWebhook?: string; // optional notifications webhook URL
  // urgent todos (client-managed)
  urgentTodos: UrgentTodo[];
  // settings helpers
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<boolean>;
  addMessage: (m: Message) => void;
  setMessages: (items: Message[]) => void;
  saveMessage: (id: string) => void;
  deleteSaved: (id: string) => void;
  setSaved: (items: SavedMessage[]) => void;
  setRituals: (items: RitualConfig[]) => void;
  addRitual: (r: RitualConfig) => void;
  updateRitual: (id: string, patch: Partial<RitualConfig>) => void;
  deleteRitual: (id: string) => void;
  clearMessages: () => Promise<void>;
  setTone: (t: Tone) => void;
  setFallbackWebhook: (url: string) => void;
  setTheme: (t: Theme) => void;
  setNotificationsWebhook: (url: string) => void;
  // urgent todos helpers
  loadUrgentTodos: () => void;
  addUrgentTodo: (t: UrgentTodo) => void;
  updateUrgentTodo: (id: string, patch: Partial<UrgentTodo>) => void;
  toggleUrgentDone: (id: string) => void;
  deleteUrgentTodo: (id: string) => void;
  clearCompletedUrgent: () => void;
};

const urgentKey = "psa.urgentTodos";

function readUrgentTodos(): UrgentTodo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(urgentKey);
    if (!raw) return [];
    const arr = JSON.parse(raw) as UrgentTodo[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeUrgentTodos(items: UrgentTodo[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(urgentKey, JSON.stringify(items));
  } catch {}
}

export const useAppStore = create<AppState>((set, get) => ({
  messages: devMessages,
  rituals: devRituals,
  saved: devSaved,
  tone: "Gentle",
  fallbackWebhook: "",
  theme: "dark",
  notificationsWebhook: "",
  urgentTodos: [],
  
  // Load settings from server (Neon). If endpoint fails, keep current defaults.
  loadSettings: async () => {
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      const data = await res.json().catch(() => ({} as any));
      if (data?.ok && data?.settings) {
        const s: Settings = data.settings;
        set({ tone: s.tone, fallbackWebhook: s.fallbackWebhook, notificationsWebhook: s.notificationsWebhook, theme: s.theme });
      }
    } catch {
      // no-op in dev or offline
    }
  },

  // Save current settings to server explicitly
  saveSettings: async () => {
    try {
      const { tone, fallbackWebhook, notificationsWebhook, theme } = get();
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tone, fallbackWebhook, notificationsWebhook, theme }),
      });
      const data = await res.json().catch(() => ({} as any));
      return !!data?.ok;
    } catch {
      return false;
    }
  },

  addMessage: (m) => {
    const existing = get().messages;
    // Guard: prevent duplicate Good night cards
    if ((m as any)?.metadata?.demo === 'goodnightCard') {
      const already = existing.some((x: any) => x?.metadata?.demo === 'goodnightCard');
      if (already) return; // skip adding another
    }
    const arr = [...existing, m];
    // keep last 100
    const trimmed = arr.slice(Math.max(0, arr.length - 100));
    set({ messages: trimmed });
  },

  setMessages: (items) => set({ messages: items.slice(-100) }),

  saveMessage: (id) => {
    const msg = get().messages.find((x) => x.id === id);
    if (!msg) return;
    const saved: SavedMessage = {
      id: `sv_${id}`,
      text: msg.text,
      createdAt: Date.now(),
    };
    set({ saved: [saved, ...get().saved] });
    // Fire-and-forget persist call to API (no secret on client)
    fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(saved),
    }).catch(() => {});
  },

  deleteSaved: (id) => set({ saved: get().saved.filter((s) => s.id !== id) }),
  setSaved: (items) => set({ saved: items }),
  setRituals: (items) => set({ rituals: items }),

  addRitual: (r) => {
    set({ rituals: [r, ...get().rituals] });
    fetch("/api/rituals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(r),
    }).catch(() => {});
  },

  updateRitual: (id, patch) => {
    const next = get().rituals.map((r) => (r.id === id ? { ...r, ...patch } : r));
    set({ rituals: next });
    const full = next.find((r) => r.id === id);
    if (full) {
      fetch("/api/rituals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(full),
      }).catch(() => {});
    }
  },

  deleteRitual: (id) => {
    set({ rituals: get().rituals.filter((r) => r.id !== id) });
    fetch(`/api/rituals?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  },

  clearMessages: async () => {
    try {
      await fetch("/api/messages", { method: "DELETE" });
    } catch {}
    set({ messages: [] });
  },

  setTone: (t) => set({ tone: t }),
  setFallbackWebhook: (url: string) => set({ fallbackWebhook: url }),
  setTheme: (t) => set({ theme: t }),
  setNotificationsWebhook: (url: string) => set({ notificationsWebhook: url }),

  // Urgent todos CRUD (client-only persistence)
  loadUrgentTodos: () => {
    const items = readUrgentTodos();
    set({ urgentTodos: items });
  },
  addUrgentTodo: (t) => {
    const next = [t, ...get().urgentTodos];
    set({ urgentTodos: next });
    writeUrgentTodos(next);
  },
  updateUrgentTodo: (id, patch) => {
    const next = get().urgentTodos.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: Date.now() } : x));
    set({ urgentTodos: next });
    writeUrgentTodos(next);
  },
  toggleUrgentDone: (id) => {
    const next = get().urgentTodos.map((x) => (x.id === id ? { ...x, done: !x.done, updatedAt: Date.now() } : x));
    set({ urgentTodos: next });
    writeUrgentTodos(next);
  },
  deleteUrgentTodo: (id) => {
    const next = get().urgentTodos.filter((x) => x.id !== id);
    set({ urgentTodos: next });
    writeUrgentTodos(next);
  },
  clearCompletedUrgent: () => {
    const next = get().urgentTodos.filter((x) => !x.done);
    set({ urgentTodos: next });
    writeUrgentTodos(next);
  },
}));

