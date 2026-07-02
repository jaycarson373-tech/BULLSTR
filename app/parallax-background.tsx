"use client";

import { useEffect } from "react";

export function ParallaxBackground() {
  useEffect(() => {
    let frame = 0;

    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        document.documentElement.style.setProperty("--scroll-y", `${window.scrollY}px`);
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
    };
  }, []);

  return (
    <div className="site-bg" aria-hidden="true">
      <div className="parallax-layer bg-hills" />
      <div className="parallax-layer bg-stone" />
      <div className="parallax-layer bg-fog" />
      <div className="parallax-layer bg-vignette" />
    </div>
  );
}
