"use client";

import { API_URL } from "@/app/site";
import type { Todo } from "@/types";
import { randomUuid } from "./id";

const listIdKey = "list-id";
const listParam = "list";
const pushDelay = 600;

let listId = "";
let pushTimer = 0;
let pending: Todo[] | null = null;

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function showInUrl(id: string) {
  const url = new URL(window.location.href);
  if (url.searchParams.get(listParam) === id) return;

  url.searchParams.set(listParam, id);
  window.history.replaceState(null, "", url);
}

async function pull(adopt: (todos: Todo[]) => void) {
  try {
    const response = await fetch(`${API_URL}/lists/${listId}`);
    if (!response.ok) return;

    const list = (await response.json()) as { items?: Todo[] };
    if (list.items?.length) adopt(list.items);
  } catch {
    return;
  }
}

async function push() {
  const items = pending;
  pending = null;
  if (!items) return;

  try {
    const response = await fetch(`${API_URL}/lists/${listId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

    if (response.ok) showInUrl(listId);
  } catch {
    return;
  }
}

export function scheduleSave(todos: Todo[]) {
  if (!listId) return;

  pending = todos;
  window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(push, pushDelay);
}

export function startSync(local: Todo[], adopt: (todos: Todo[]) => void) {
  const store = storage();
  const shared = new URLSearchParams(window.location.search).get(listParam);
  const saved = store?.getItem(listIdKey);
  const adopting = Boolean(shared) && local.length === 0;

  listId = adopting ? shared! : (saved ?? randomUuid());
  store?.setItem(listIdKey, listId);

  if (adopting) {
    void pull(adopt);
    return;
  }

  if (local.length > 0) showInUrl(listId);
}
