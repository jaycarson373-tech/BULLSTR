"use client";

import { useEffect, useRef } from "react";

export function CatCursor() {
  const cursorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor || window.matchMedia("(pointer: coarse)").matches) return;
    const cursorElement = cursor;

    document.documentElement.classList.add("cat-cursor-active");

    function moveCursor(event: MouseEvent) {
      cursorElement.style.transform = `translate(${event.clientX}px, ${event.clientY}px) translate(-50%, -50%)`;

      const trail = document.createElement("span");
      trail.className = "cat-trail";
      trail.textContent = Math.random() > 0.5 ? "🐾" : "✨";
      trail.style.left = `${event.clientX}px`;
      trail.style.top = `${event.clientY}px`;
      document.body.appendChild(trail);
      window.setTimeout(() => trail.remove(), 700);
    }

    window.addEventListener("mousemove", moveCursor, { passive: true });

    return () => {
      document.documentElement.classList.remove("cat-cursor-active");
      window.removeEventListener("mousemove", moveCursor);
    };
  }, []);

  return <div ref={cursorRef} className="cat-cursor" aria-hidden="true">🐱</div>;
}
