"use client";

import { useEffect, useRef } from "react";

const MAX_ROTATE_Y = 15;
const MAX_ROTATE_X = 11;
const MAX_TRANSLATE = 10;

function clamp(value: number) {
  return Math.max(-1, Math.min(1, value));
}

export function BullLogoHero() {
  const bullRef = useRef<HTMLImageElement | null>(null);
  const targetRef = useRef({ rotateX: 0, rotateY: 0, translateX: 0, translateY: 0 });
  const currentRef = useRef({ rotateX: 0, rotateY: 0, translateX: 0, translateY: 0 });
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const applyTransform = () => {
      const bull = bullRef.current;
      if (!bull) return;

      const current = currentRef.current;
      const target = reducedMotion.matches
        ? { rotateX: 0, rotateY: 0, translateX: 0, translateY: 0 }
        : targetRef.current;

      current.rotateX += (target.rotateX - current.rotateX) * 0.1;
      current.rotateY += (target.rotateY - current.rotateY) * 0.1;
      current.translateX += (target.translateX - current.translateX) * 0.1;
      current.translateY += (target.translateY - current.translateY) * 0.1;

      bull.style.transform = `translate3d(${current.translateX}px, ${current.translateY}px, 0) rotateX(${current.rotateX}deg) rotateY(${current.rotateY}deg)`;
      frameRef.current = window.requestAnimationFrame(applyTransform);
    };

    const updateTarget = (clientX: number, clientY: number) => {
      if (reducedMotion.matches) return;

      const x = clamp((clientX - window.innerWidth / 2) / (window.innerWidth / 2));
      const y = clamp((clientY - window.innerHeight / 2) / (window.innerHeight / 2));

      targetRef.current = {
        rotateY: x * MAX_ROTATE_Y,
        rotateX: -y * MAX_ROTATE_X,
        translateX: x * MAX_TRANSLATE,
        translateY: y * MAX_TRANSLATE
      };
    };

    const handlePointerMove = (event: PointerEvent) => updateTarget(event.clientX, event.clientY);
    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch) updateTarget(touch.clientX, touch.clientY);
    };
    const resetTarget = () => {
      targetRef.current = { rotateX: 0, rotateY: 0, translateX: 0, translateY: 0 };
    };

    frameRef.current = window.requestAnimationFrame(applyTransform);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("pointerleave", resetTarget);

    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("pointerleave", resetTarget);
    };
  }, []);

  return (
    <div className="bull-logo-hero" aria-hidden="true">
      <div className="bull-logo-orbit">
        <img ref={bullRef} src="/brand/bull-hero.png" alt="" />
      </div>
    </div>
  );
}
