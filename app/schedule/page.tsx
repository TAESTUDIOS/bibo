// app/schedule/page.tsx
// Schedule Overview: lists days vertically linking to /schedule/[date]

"use client";

import Link from "next/link";

function formatDateLabel(d: Date) {
  const opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
  return d.toLocaleDateString(undefined, opts);
}

function toISODate(d: Date) {
  // YYYY-MM-DD in local time
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function ScheduleOverviewPage() {
  const today = new Date();
  const days: { label: string; href: string }[] = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = toISODate(d);
    return { label: formatDateLabel(d), href: `/schedule/${iso}` };
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Schedule Overview</h1>
      <ul className="divide-y divide-gray-200 dark:divide-gray-800 rounded-md border border-gray-200 dark:border-gray-800 overflow-hidden">
        {days.map((d) => (
          <li key={d.href}>
            <Link
              href={d.href}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <span>{d.label}</span>
              <span className="text-xs text-gray-500">Open</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
