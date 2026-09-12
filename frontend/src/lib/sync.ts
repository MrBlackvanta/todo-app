"use client";

import type { Todo } from "@/types";
import { randomUuid } from "./id";

const listIdKey = "list-id";
const listParam = "list";
const pushDelay = 600;
const pollInterval = 5000;
const devApi = "http://localhost:5180";
const devHosts = ["localhost", "127.0.0.1"];
const configuredApi = process.env.NEXT_PUBLIC_API_URL ?? "";

let api = "";
let listId = "";
let pushTimer = 0;
let pollTimer = 0;
let pending: Todo[] | null = null;
let syncedAt = 0;

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function resolveApi() {
  if (configuredApi) return configuredApi;

  return devHosts.includes(window.location.hostname) ? devApi : "";
}

function showInUrl(id: string) {
  const url = new URL(window.location.href);
  if (url.searchParams.get(listParam) === id) return;

  url.searchParams.set(listParam, id);
  window.history.replaceState(null, "", url);
}

async function pull(adopt: (todos: Todo[]) => void) {
  try {
    const response = await fetch(`${api}/lists/${listId}`);
    if (!response.ok) return;

    const list = (await response.json()) as {
      updatedAt?: string;
      items?: Todo[];
    };

    const stamp = Date.parse(list.updatedAt ?? "");
    if (!list.items || !(stamp > syncedAt)) return;

    syncedAt = stamp;
    adopt(list.items);
  } catch {
    return;
  }
}

async function push() {
  const items = pending;
  pending = null;
  if (!items) return;

  try {
    const response = await fetch(`${api}/lists/${listId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    if (!response.ok) return;

    const saved = (await response.json()) as { updatedAt?: string };
    syncedAt = Date.parse(saved.updatedAt ?? "") || syncedAt;
    showInUrl(listId);
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
  api = resolveApi();
  if (!api) return () => {};

  const store = storage();
  const shared = new URLSearchParams(window.location.search).get(listParam);
  const saved = store?.getItem(listIdKey);
  const adopting = Boolean(shared) && local.length === 0;
  const known = adopting || Boolean(saved);

  listId = adopting ? shared! : (saved ?? randomUuid());
  store?.setItem(listIdKey, listId);

  function poll() {
    if (!syncedAt || pending || document.hidden) return;

    void pull(adopt);
  }

  if (local.length > 0) scheduleSave(local);
  else if (known) void pull(adopt);

  pollTimer = window.setInterval(poll, pollInterval);
  document.addEventListener("visibilitychange", poll);

  return () => {
    window.clearInterval(pollTimer);
    document.removeEventListener("visibilitychange", poll);
  };
}
