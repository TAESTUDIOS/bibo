/**
 * lib/types.ts
 * Core TypeScript interfaces for PSA.
 */

export type Role = "user" | "assistant" | "system" | "ritual";

export type EmotionTone = "positive" | "neutral" | "negative";

export type EmotionId =
  | "amazed"
  | "happy"
  | "joyful"
  | "frustrated"
  | "angry"
  | "furious"
  | "playful";

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: number; // epoch ms
  ritualId?: string;
  buttons?: string[]; // optional inline buttons for ritual messages
  metadata?: Record<string, unknown>;
  emotionId?: EmotionId;
  emotionTone?: EmotionTone;
}

export type TriggerType = "schedule" | "chat";

export interface RitualTrigger {
  type: TriggerType;
  time?: string; // HH:mm (for schedule)
  repeat?: "daily" | "weekly" | "monthly" | "none";
  chatKeyword?: string; // e.g., "/check"
}

export interface RitualConfig {
  id: string;
  name: string;
  webhook: string; // n8n webhook URL
  trigger: RitualTrigger;
  buttons?: string[];
  active?: boolean;
}

export interface SavedMessage {
  id: string;
  text: string;
  createdAt: number;
  tags?: string[];
}

export type Tone = "Gentle" | "Strict" | "Playful" | "Neutral";

export type Theme = "light" | "dark";

// Server-stored singleton settings
export interface Settings {
  tone: Tone;
  fallbackWebhook: string;
  theme: Theme;
  notificationsWebhook?: string;
}

// Appointment items for day scheduling
export interface Appointment {
  id: string;
  title: string;
  // ISO date for the day, e.g., "2025-09-16"
  date: string;
  // Start time in HH:mm (24h)
  start: string;
  // Duration in minutes
  durationMin: number;
  notes?: string;
}

// Urgent todo items (client-side managed)
export type UrgentPriority = "high" | "medium" | "low";

export interface UrgentTodo {
  id: string;
  title: string;
  priority: UrgentPriority;
  done: boolean;
  dueAt?: number; // epoch ms
  notes?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}
