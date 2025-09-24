"use client";
// app/chat/page.tsx
// Chat page renders ChatWindow + ChatInput

import ChatWindow from "@/components/ChatWindow";
import ChatInput from "@/components/ChatInput";
import DemoMenu from "@/components/DemoMenu";
import RitualsMenu from "@/components/RitualsMenu";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";

export default function ChatPage() {
  const { setMessages, clearMessages } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    fetch("/api/messages")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.messages)) setMessages(data.messages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [setMessages]);
  return (
    <div className="flex flex-col flex-1 min-h-0 h-full">
      <div className="flex-1 min-h-0">
        <div className="h-full flex flex-col border border-[var(--border)] rounded-lg bg-[var(--surface-1)] shadow-subtle relative">
          {/* Top bar with Action dropdown (left of hamburger), right-aligned */}
          <div className="flex items-center justify-end gap-2 px-2 py-2 border-b border-[var(--border)] rounded-t-lg">
            {/* Action dropdown opens downward by default (no up prop) */}
            <DemoMenu label="Action" />
            {/* Rituals dropdown sits next to Action */}
            <RitualsMenu />
            {/* Clear chat button */}
            <button
              type="button"
              aria-label="Clear chat"
              title="Clear chat"
              disabled={clearing}
              onClick={async () => {
                setClearing(true);
                try {
                  await clearMessages();
                } finally {
                  // small delay to show feedback
                  setTimeout(() => setClearing(false), 200);
                }
              }}
              className="inline-flex items-center justify-center h-9 px-2 py-0 rounded-md border border-[var(--border)] bg-[var(--surface-1)] text-[var(--fg)]/90 hover:bg-[var(--surface-2)] disabled:opacity-60 shadow-subtle"
            >
              {clearing ? (
                <span className="h-4 w-4 rounded-full border-2 border-[var(--border)] border-t-[var(--fg)]/70 animate-spin align-middle" aria-hidden="true" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0 align-middle">
                  <path d="M9 3.75A1.75 1.75 0 0 1 10.75 2h2.5A1.75 1.75 0 0 1 15 3.75V5h4.25a.75.75 0 0 1 0 1.5H18.6l-1.02 12.24A2.75 2.75 0 0 1 14.84 21H9.16a2.75 2.75 0 0 1-2.74-2.26L5.4 6.5H4.75a.75.75 0 0 1 0-1.5H9V3.75Zm1.5 1.25h3V5h-3V5zM7 6.5l1 12a1.25 1.25 0 0 0 1.25 1.12h5.5A1.25 1.25 0 0 0 16 18.5l1-12H7Z" />
                </svg>
              )}
            </button>
            {/* Hamburger button */}
            <button
              type="button"
              aria-label="Open menu"
              className="ml-2 inline-flex items-center justify-center h-9 px-3 py-0 rounded-md border border-[var(--border)] bg-[var(--surface-1)] text-[var(--fg)]/90 hover:bg-[var(--surface-2)] shadow-subtle"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0 align-middle">
                <path d="M4 6.75A.75.75 0 014.75 6h14.5a.75.75 0 010 1.5H4.75A.75.75 0 014 6.75zm0 5A.75.75 0 014.75 11h14.5a.75.75 0 010 1.5H4.75A.75.75 0 014 11.75zm0 5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H4.75a.75.75 0 01-.75-.75z" />
              </svg>
            </button>
          </div>
          <div className="flex-1 min-h-0 relative">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-6 w-6 rounded-full border-2 border-[var(--border)] border-t-[var(--fg)]/70 animate-spin" aria-label="Loading messages" />
              </div>
            ) : (
              <ChatWindow />
            )}
          </div>
          <div className="border-t border-[var(--border)] p-2 md:p-3">
            <ChatInput />
          </div>
        </div>
      </div>
    </div>
  );
}


