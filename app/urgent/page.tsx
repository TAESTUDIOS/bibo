// app/urgent/page.tsx
// Purpose: Urgent todos page with configurable items. Wires to Zustand store and persists in localStorage.

"use client";

import { useEffect } from "react";
import UrgentTodoForm from "@/components/UrgentTodoForm";
import UrgentTodoList from "@/components/UrgentTodoList";
import { useAppStore } from "@/lib/store";

export default function UrgentPage() {
  const { addUrgentTodo, loadUrgentTodos } = useAppStore();

  useEffect(() => {
    loadUrgentTodos();
  }, [loadUrgentTodos]);

  return (
    <div className="flex-1 min-h-0">
      <h1 className="text-2xl font-semibold">Urgent</h1>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">Fast inbox for critical tasks. Stored locally on this device.</p>
      <UrgentTodoForm onAdd={addUrgentTodo} />
      <UrgentTodoList />
    </div>
  );
}
