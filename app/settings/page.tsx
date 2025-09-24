// app/settings/page.tsx
// Settings: tone selector, clear chat, fallback webhook input, and short env explanation.

"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import type { Tone } from "@/lib/types";

export default function SettingsPage() {
  const { tone, setTone, clearMessages, fallbackWebhook, setFallbackWebhook, notificationsWebhook, setNotificationsWebhook, theme, setTheme, loadSettings, saveSettings } = useAppStore();
  const [testWebhook, setTestWebhook] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<null | "ok" | "err">(null);

  useEffect(() => {
    // Load from Neon on first render
    loadSettings();
  }, [loadSettings]);

  async function testWebhookCall() {
    if (!testWebhook.trim()) return;
    try {
      await fetch(testWebhook.trim(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ping: true, ts: Date.now() }),
      });
      alert("Webhook pinged (check your n8n)");
    } catch {
      alert("Webhook test failed (likely CORS or invalid URL)");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <div className="flex items-center gap-3">
        <button
          onClick={async () => {
            setSaving(true);
            const ok = await saveSettings();
            setSaving(false);
            setSaveResult(ok ? "ok" : "err");
            setTimeout(() => setSaveResult(null), 2000);
          }}
          className="px-3 py-1.5 rounded bg-gray-900 text-white text-sm disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
        {saveResult === "ok" && <span className="text-xs text-green-600">Saved</span>}
        {saveResult === "err" && <span className="text-xs text-red-600">Failed to save</span>}
      </div>

      <section className="space-y-2">
        <h2 className="font-medium">Appearance</h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={theme === "dark"}
              onChange={(e) => setTheme(e.target.checked ? "dark" : "light")}
            />
            <span>Dark mode</span>
          </label>
          <span className="text-xs text-gray-500">Default is dark; your preference is saved to this device.</span>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Tone</h2>
        <select
          value={tone}
          onChange={(e) => setTone(e.target.value as Tone)}
          className="border rounded px-2 py-1 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
        >
          <option>Gentle</option>
          <option>Strict</option>
          <option>Playful</option>
          <option>Neutral</option>
        </select>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Chat History</h2>
        <button
          onClick={clearMessages}
          className="px-3 py-1.5 rounded bg-white border hover:bg-gray-50 text-sm dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          Clear chat history
        </button>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Fallback n8n Webhook</h2>
        <input
          className="border rounded px-2 py-1 w-full max-w-xl bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400"
          placeholder="https://... (optional, else local mock used)"
          value={fallbackWebhook}
          onChange={(e) => setFallbackWebhook(e.target.value)}
        />
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Notifications Webhook</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">Used for evaluation pings (e.g., after the 5-minute timer in Impulse Control).</p>
        <input
          className="border rounded px-2 py-1 w-full max-w-xl bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400"
          placeholder="https://your-service/webhook/notify"
          value={notificationsWebhook || ''}
          onChange={(e) => setNotificationsWebhook(e.target.value)}
        />
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Debug webhook test</h2>
        <div className="flex gap-2">
          <input
            className="border rounded px-2 py-1 flex-1 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400"
            placeholder="https://your-n8n-host/webhook/test"
            value={testWebhook}
            onChange={(e) => setTestWebhook(e.target.value)}
          />
          <button onClick={testWebhookCall} className="px-3 py-1.5 rounded bg-gray-900 text-white text-sm dark:bg-gray-100 dark:text-gray-900">
            Send test
          </button>
        </div>
        <p className="text-xs text-gray-600">
          Environment variables required later: NEXT_PUBLIC_FALLBACK_WEBHOOK, GPT key, Pushcut token. Do not commit secrets.
        </p>
      </section>
    </div>
  );
}
