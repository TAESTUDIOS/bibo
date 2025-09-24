// components/Sidebar.tsx
// Sidebar / TopNav with links to Chat, Schedule, Saved, Settings.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";

type Props = {
  variant?: "side" | "top";
};

const links = [
  { href: "/chat", label: "Chat" },
  { href: "/schedule", label: "Schedule" },
  { href: "/rituals", label: "Rituals" },
  { href: "/urgent", label: "Urgent" },
  { href: "/saved", label: "Saved" },
  { href: "/winddown", label: "Winddown" },
  { href: "/winddown-thoughts", label: "Winddown Thoughts" },
  { href: "/sleep", label: "Sleep" },
  { href: "/missions", label: "Missions" },
  { href: "/snapshot", label: "Snapshot" },
  { href: "/settings", label: "Settings" },
];

export default function Sidebar({ variant = "side" }: Props) {
  const pathname = usePathname();
  const isTop = variant === "top";
  const { rituals } = useAppStore();
  const chatTriggers = useMemo(
    () => rituals.filter((r) => r.trigger?.type === "chat" && (r.active ?? true)),
    [rituals]
  );

  const [open, setOpen] = useState(false);
  const [openTriggers, setOpenTriggers] = useState(false);

  return (
    <nav
      className={clsx(
        "text-sm",
        isTop ? "relative" : "flex flex-col h-full py-3"
      )}
      aria-label="Primary navigation"
    >
      {isTop ? (
        <div className="flex items-center justify-end w-full">
          {/* Hamburger button */}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 border border-[var(--border)] bg-[var(--surface-1)] text-[var(--fg)] shadow-subtle hover:bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-slate-400"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls="topnav-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path fillRule="evenodd" d="M3.75 5.25a.75.75 0 0 1 .75-.75h15a.75.75 0 0 1 0 1.5h-15a.75.75 0 0 1-.75-.75Zm0 6a.75.75 0 0 1 .75-.75h15a.75.75 0 0 1 0 1.5h-15a.75.75 0 0 1-.75-.75Zm0 6a.75.75 0 0 1 .75-.75h15a.75.75 0 0 1 0 1.5h-15a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
            </svg>
            <span className="sr-only">Open navigation menu</span>
          </button>

          {/* Dropdown panel */}
          {open && (
            <div
              id="topnav-menu"
              role="menu"
              aria-label="Navigation menu"
              className="absolute right-0 top-12 z-40 w-64 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-2 shadow-elevated origin-top-right"
            >
              <div className="flex flex-col" role="none">
                {links.map((l) => {
                  const active = pathname?.startsWith(l.href);
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      className={clsx(
                        "w-full px-3 py-2 rounded-md text-left transition-colors",
                        active
                          ? "bg-gray-700 text-white"
                          : "text-[var(--fg)]/85 hover:bg-[var(--surface-2)]"
                      )}
                      aria-current={active ? "page" : undefined}
                      role="menuitem"
                      onClick={() => setOpen(false)}
                    >
                      {l.label}
                    </Link>
                  );
                })}

                {/* Triggers submenu */}
                <div className="mt-1 border-t border-[var(--border)] pt-1" role="none">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md text-left text-[var(--fg)]/85 hover:bg-[var(--surface-2)]"
                    aria-haspopup="true"
                    aria-expanded={openTriggers}
                    onClick={() => setOpenTriggers((v) => !v)}
                  >
                    <span className={clsx(openTriggers ? "text-gray-400" : "")}>Triggers</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className={clsx("h-4 w-4 transition-transform", openTriggers ? "rotate-180" : "rotate-0")}
                      aria-hidden="true"
                    >
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 0 1 1.08 1.04l-4.25 4.25a.75.75 0 0 1-1.06 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {openTriggers && (
                    <ul className="mt-1 max-h-56 overflow-auto pr-1" role="menu" aria-label="Chat triggers">
                      {chatTriggers.length === 0 ? (
                        <li className="px-3 py-2 text-sm text-[var(--fg)]/50" role="none">
                          No chat triggers configured
                        </li>
                      ) : (
                        chatTriggers.map((r) => (
                          <li key={r.id} role="none">
                            <Link
                              href={`/chat?trigger=${encodeURIComponent(r.id)}`}
                              className="block w-full truncate px-3 py-2 text-left text-[var(--fg)]/85 hover:bg-[var(--surface-2)] rounded-md"
                              role="menuitem"
                              onClick={() => setOpen(false)}
                              title={r.name}
                            >
                              {r.name} {r.trigger?.chatKeyword ? `(${r.trigger.chatKeyword})` : ""}
                            </Link>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Desktop/side navigation remains as a simple vertical list
        <div className="flex flex-col">
          {links.map((l) => {
            const active = pathname?.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={clsx(
                  "px-3 py-2 rounded-md transition-colors min-w-[72px] text-left",
                  active
                    ? "bg-gray-700 text-white"
                    : "text-[var(--fg)]/80 hover:bg-[var(--surface-2)]"
                )}
                aria-current={active ? "page" : undefined}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}

