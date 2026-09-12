"use client";

const collapseDuration = 200;
const stallMargin = 400;
const clearStagger = 40;
const clearWindow = 320;

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function stallDeadline(animation: Animation) {
  const { endTime } = animation.effect?.getComputedTiming() ?? {};

  return Number(endTime ?? collapseDuration) + stallMargin;
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
    }, stallDeadline(animation));

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

async function slide(
  element: HTMLElement,
  frames: Keyframe[],
  options: KeyframeAnimationOptions,
) {
  element.style.overflow = "clip";

  await settle(
    element.animate(frames, { duration: collapseDuration, ...options }),
  );

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
    { easing: "ease-out" },
  );
}

export function closeRow(element: HTMLElement, delay = 0) {
  if (prefersReducedMotion()) return Promise.resolve();

  return slide(
    element,
    [
      { height: `${element.offsetHeight}px`, transform: "none" },
      { height: "0px", transform: "translateX(100%)" },
    ],
    { easing: "ease-in", delay, fill: "forwards" },
  );
}

export function closeRows(elements: HTMLElement[]) {
  return Promise.all(
    elements.map((element, position) =>
      closeRow(element, Math.min(position * clearStagger, clearWindow)),
    ),
  );
}
