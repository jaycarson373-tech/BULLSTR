"use client";

import { useEffect, useRef } from "react";

export function AnimatedBackground() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const handlePointerMove = (event: PointerEvent) => {
      root.style.setProperty("--cursor-x", `${event.clientX}px`);
      root.style.setProperty("--cursor-y", `${event.clientY}px`);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  return (
    <div ref={rootRef} className="index-animated-bg strategy-bg" aria-hidden="true">
      <div className="strategy-bg-cursor" />
      <div className="strategy-bg-bull">
        <img src="/brand/strategy-bull-parallax.png" alt="" />
      </div>
      <div className="strategy-bg-grid" />
      <div className="strategy-bg-mountains" />
      <div className="strategy-bg-chart" />
      <div className="strategy-bg-particles">
        {Array.from({ length: 18 }).map((_, index) => (
          <span key={index} />
        ))}
      </div>
      <div className="index-bg-vignette" />
    </div>
  );
}
