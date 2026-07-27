"use client";

import { useEffect, useRef } from "react";

export function BullCursor() {
  const cursorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor || window.matchMedia("(pointer: coarse)").matches) return;
    const cursorElement = cursor;

    document.documentElement.classList.add("bull-cursor-active");

    function moveCursor(event: MouseEvent) {
      cursorElement.style.transform = `translate(${event.clientX}px, ${event.clientY}px) translate(-50%, -50%)`;

      const trail = document.createElement("span");
      trail.className = "bull-trail";
      trail.textContent = "🐂";
      trail.style.left = `${event.clientX}px`;
      trail.style.top = `${event.clientY}px`;
      document.body.appendChild(trail);
      window.setTimeout(() => trail.remove(), 650);
    }

    window.addEventListener("mousemove", moveCursor, { passive: true });

    return () => {
      document.documentElement.classList.remove("bull-cursor-active");
      window.removeEventListener("mousemove", moveCursor);
    };
  }, []);

  return <div ref={cursorRef} className="bull-cursor" aria-hidden="true">🐂</div>;
}
