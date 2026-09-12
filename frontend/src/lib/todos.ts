"use client";

import type { Todo } from "@/types";
import { useSyncExternalStore } from "react";
import { randomUuid } from "./id";
import { scheduleSave, startSync } from "./sync";
import { reservedRowsProperty, todosStorageKey } from "./todosScript";

export const titleMaxLength = 200;

const listeners = new Set<() => void>();
const none: Todo[] = [];

let todos: Todo[] | null = null;

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isTodo(value: unknown): value is Todo {
  if (typeof value !== "object" || value === null) return false;
  const { id, title, completed } = value as Record<string, unknown>;

  return (
    typeof id === "string" &&
    typeof title === "string" &&
    typeof completed === "boolean"
  );
}

function parse(raw: string | null): Todo[] {
  if (!raw) return none;

  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(isTodo) : none;
  } catch {
    return none;
  }
}

function read(): Todo[] {
  todos ??= parse(storage()?.getItem(todosStorageKey) ?? null);
  return todos;
}

function keep(next: Todo[]) {
  todos = next;
  storage()?.setItem(todosStorageKey, JSON.stringify(next));
  listeners.forEach((notify) => notify());
}

function commit(next: Todo[]) {
  keep(next);
  scheduleSave(next);
}

function subscribe(notify: () => void) {
  document.documentElement.style.removeProperty(reservedRowsProperty);

  function followOtherTabs(event: StorageEvent) {
    if (event.key !== todosStorageKey) return;
    keep(parse(event.newValue));
  }

  listeners.add(notify);
  window.addEventListener("storage", followOtherTabs);

  if (listeners.size === 1) startSync(read(), keep);

  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", followOtherTabs);
  };
}

export function addTodo(title: string) {
  const trimmed = title.trim();
  if (!trimmed) return null;

  const id = randomUuid();
  commit([...read(), { id, title: trimmed, completed: false }]);

  return id;
}

export function toggleTodo(id: string) {
  commit(
    read().map((todo) =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo,
    ),
  );
}

export function renameTodo(id: string, title: string) {
  const trimmed = title.trim();
  if (!trimmed) return;

  commit(
    read().map((todo) => (todo.id === id ? { ...todo, title: trimmed } : todo)),
  );
}

export function removeTodo(id: string) {
  commit(read().filter((todo) => todo.id !== id));
}

export function clearCompleted() {
  commit(read().filter((todo) => !todo.completed));
}

export function moveTodo(from: number, to: number) {
  const next = [...read()];
  const [moved] = next.splice(from, 1);
  if (!moved) return;

  next.splice(to, 0, moved);
  commit(next);
}

export function useTodos() {
  return useSyncExternalStore(subscribe, read, () => none);
}
