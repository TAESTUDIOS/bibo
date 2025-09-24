// components/UrgentTodoList.tsx
// Purpose: Render and manage urgent todos list. < 100 LOC

"use client";

import type { UrgentPriority, UrgentTodo } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { useMemo, useState } from "react";

export default function UrgentTodoList() {
  const { urgentTodos, toggleUrgentDone, updateUrgentTodo, deleteUrgentTodo, clearCompletedUrgent } = useAppStore();
  const [filter, setFilter] = useState<"all" | "open" | "done">("all");
  const [prio, setPrio] = useState<"all" | UrgentPriority>("all");

  const items = useMemo(() => {
    let arr = [...urgentTodos];
    if (filter !== "all") arr = arr.filter((t) => (filter === "done" ? t.done : !t.done));
    if (prio !== "all") arr = arr.filter((t) => t.priority === prio);
    // sort: not done first, then high>medium>low, then due soonest
    const rank = { high: 0, medium: 1, low: 2 } as const;
    arr.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const r = rank[a.priority] - rank[b.priority];
      if (r !== 0) return r;
      const da = a.dueAt ?? Infinity;
      const db = b.dueAt ?? Infinity;
      return da - db;
    });
    return arr;
  }, [urgentTodos, filter, prio]);

  function onTitleEdit(id: string, title: string) {
    updateUrgentTodo(id, { title });
  }

  function onPriorityChange(id: string, p: UrgentPriority) {
    updateUrgentTodo(id, { priority: p });
  }

  return (
    <div className="mt-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="done">Done</option>
        </select>
        <select value={prio} onChange={(e) => setPrio(e.target.value as any)} className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
          <option value="all">Any priority</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button onClick={clearCompletedUrgent} className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800">Clear completed</button>
      </div>

      <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
        {items.length === 0 ? (
          <li className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400">No items match.</li>
        ) : (
          items.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-3 py-2">
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => toggleUrgentDone(t.id)}
                aria-label={`Mark ${t.title} as ${t.done ? "open" : "done"}`}
              />
              <input
                value={t.title}
                onChange={(e) => onTitleEdit(t.id, e.target.value)}
                className="flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm focus:border-gray-300 focus:outline-none dark:focus:border-gray-700"
              />
              <select
                value={t.priority}
                onChange={(e) => onPriorityChange(t.id, e.target.value as UrgentPriority)}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              {t.dueAt && (
                <span className="whitespace-nowrap text-xs text-gray-500 dark:text-gray-400" title={new Date(t.dueAt).toLocaleString()}>
                  due {new Date(t.dueAt).toLocaleDateString()}
                </span>
              )}
              <button
                onClick={() => deleteUrgentTodo(t.id)}
                className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"
                aria-label={`Delete ${t.title}`}
              >
                Delete
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
