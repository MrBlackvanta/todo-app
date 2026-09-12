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

export function openRow(element: HTMLElement) {
  if (prefersReducedMotion()) return;

  void settle(
    element.animate(
      [{ height: "0px" }, { height: `${element.offsetHeight}px` }],
      { duration: collapseDuration, easing: "ease-out" },
    ),
  );
}

export function closeRow(element: HTMLElement) {
  if (prefersReducedMotion()) return Promise.resolve();

  return settle(
    element.animate(
      [{ height: `${element.offsetHeight}px` }, { height: "0px" }],
      { duration: collapseDuration, easing: "ease-in" },
    ),
  );
}
