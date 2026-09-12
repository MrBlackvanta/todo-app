"use client";

const collapseDuration = 200;
const stallDeadline = 600;

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function settle(animation: Animation) {
  return new Promise<void>((resolve) => {
    const stop = () => {
      window.clearTimeout(timer);
      resolve();
    };

    const timer = window.setTimeout(() => {
      animation.finish();
      stop();
    }, stallDeadline);

    animation.finished.then(stop, stop);
  });
}

export function shiftFrom(element: HTMLElement, distance: number) {
  if (distance === 0 || prefersReducedMotion()) return;

  void settle(
    element.animate(
      [{ transform: `translateY(${distance}px)` }, { transform: "none" }],
      { duration: collapseDuration, easing: "ease-out" },
    ),
  );
}

async function slide(element: HTMLElement, frames: Keyframe[], easing: string) {
  element.style.overflow = "clip";

  await settle(element.animate(frames, { duration: collapseDuration, easing }));

  element.style.overflow = "";
}

export function openRow(element: HTMLElement) {
  if (prefersReducedMotion()) return;

  void slide(
    element,
    [
      { height: "0px", transform: "translateX(-100%)" },
      { height: `${element.offsetHeight}px`, transform: "none" },
    ],
    "ease-out",
  );
}

export function closeRow(element: HTMLElement) {
  if (prefersReducedMotion()) return Promise.resolve();

  return slide(
    element,
    [
      { height: `${element.offsetHeight}px`, transform: "none" },
      { height: "0px", transform: "translateX(100%)" },
    ],
    "ease-in",
  );
}
