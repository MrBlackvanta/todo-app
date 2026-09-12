"use client";

import { moveTodo, shiftFrom } from "@/lib";
import type { Todo } from "@/types";
import { useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { flushSync } from "react-dom";

const dragThreshold = 5;
const touchHoldDelay = 400;

type Grab = {
  pointerId: number;
  index: number;
  row: HTMLLIElement;
  offsetInRow: number;
  startY: number;
  dragging: boolean;
  hold: number;
};

function blockScroll(event: TouchEvent) {
  event.preventDefault();
}

function swallowClick(event: Event) {
  event.preventDefault();
  event.stopPropagation();
}

function pinTo(row: HTMLLIElement, top: number) {
  row.style.transform = "";
  row.style.transform = `translateY(${top - row.getBoundingClientRect().top}px)`;
}

function positionOf(row: Element) {
  return [...(row.parentElement?.children ?? [])].indexOf(row);
}

export function useReorder(todos: Todo[], enabled: boolean) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [notice, setNotice] = useState({ text: "", id: 0 });
  const grab = useRef<Grab | null>(null);

  function announce(text: string) {
    setNotice((previous) => ({ text, id: previous.id + 1 }));
  }

  function relocate(list: Element, from: number, to: number, glide: boolean) {
    for (const row of list.children) {
      for (const animation of row.getAnimations()) animation.finish();
    }

    const starts = new Map<Element, number>();
    for (const row of list.children) {
      starts.set(row, row.getBoundingClientRect().top);
    }
    const moved = list.children[from];

    flushSync(() => moveTodo(from, to));

    for (const row of list.children) {
      const start = starts.get(row);
      if (start === undefined || (row === moved && !glide)) continue;
      shiftFrom(row as HTMLElement, start - row.getBoundingClientRect().top);
    }
  }

  function beginDrag(current: Grab) {
    current.dragging = true;
    current.row.setPointerCapture(current.pointerId);
    document.addEventListener("touchmove", blockScroll, { passive: false });
    document.body.style.userSelect = "none";
    setDraggingId(todos[current.index]?.id ?? null);
  }

  function release() {
    const current = grab.current;
    grab.current = null;
    if (!current) return;

    window.clearTimeout(current.hold);
    document.removeEventListener("touchmove", blockScroll);
    current.row.style.transform = "";

    if (!current.dragging) return;

    document.body.style.userSelect = "";
    current.row.addEventListener("click", swallowClick, { capture: true });
    window.setTimeout(() => {
      current.row.removeEventListener("click", swallowClick, { capture: true });
    }, 0);

    setDraggingId(null);
    announce(`Dropped at position ${current.index + 1} of ${todos.length}.`);
  }

  function onPointerDown(event: PointerEvent<HTMLLIElement>) {
    if (!enabled || event.button !== 0 || grab.current) return;
    if ((event.target as HTMLElement).closest("button")) return;

    const row = event.currentTarget;
    const index = positionOf(row);
    if (index < 0) return;

    const current: Grab = {
      pointerId: event.pointerId,
      index,
      row,
      offsetInRow: event.clientY - row.getBoundingClientRect().top,
      startY: event.clientY,
      dragging: false,
      hold: 0,
    };
    grab.current = current;

    if (event.pointerType === "touch") {
      current.hold = window.setTimeout(
        () => beginDrag(current),
        touchHoldDelay,
      );
    }
  }

  function onPointerMove(event: PointerEvent<HTMLLIElement>) {
    const current = grab.current;
    if (!current || event.pointerId !== current.pointerId) return;

    if (!current.dragging) {
      if (Math.abs(event.clientY - current.startY) < dragThreshold) return;
      if (event.pointerType === "touch") return release();
      beginDrag(current);
    }

    const list = current.row.parentElement;
    if (!list) return;

    const bounds = list.getBoundingClientRect();
    const wanted = Math.min(
      Math.max(event.clientY - current.offsetInRow, bounds.top),
      bounds.bottom - current.row.offsetHeight,
    );
    const trailing = wanted + current.row.offsetHeight;

    let target = current.index;
    for (const [position, row] of [...list.children].entries()) {
      if (row === current.row) continue;
      const box = row.getBoundingClientRect();
      const middle = box.top + box.height / 2;
      if (position < current.index && wanted < middle) {
        target = Math.min(target, position);
      }
      if (position > current.index && trailing > middle) {
        target = Math.max(target, position);
      }
    }

    if (target !== current.index) {
      relocate(list, current.index, target, false);
      current.index = target;
    }

    pinTo(current.row, wanted);
  }

  function onKeyDown(event: KeyboardEvent<HTMLLIElement>) {
    if (!enabled || !event.altKey) return;

    const step =
      event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
    if (step === 0) return;

    const list = event.currentTarget.parentElement;
    if (!list) return;

    const from = positionOf(event.currentTarget);
    const to = from + step;
    if (to < 0 || to >= list.children.length) return;

    event.preventDefault();
    relocate(list, from, to, true);
    announce(
      `${todos[from]?.title ?? "Task"} moved to position ${to + 1} of ${todos.length}.`,
    );
  }

  return {
    draggingId,
    notice,
    rowHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: release,
      onPointerCancel: release,
      onKeyDown,
    },
  };
}
