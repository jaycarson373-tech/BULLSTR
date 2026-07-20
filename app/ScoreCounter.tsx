"use client";

import { useEffect, useRef, useState } from "react";

type ScoreCounterProps = {
  value: string;
};

export function ScoreCounter({ value }: ScoreCounterProps) {
  const target = Number.parseFloat(value);
  const decimals = value.includes(".") ? value.split(".")[1]?.length ?? 0 : 0;
  const [displayValue, setDisplayValue] = useState(Number.isFinite(target) ? 0 : null);
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!Number.isFinite(target) || !elementRef.current) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setDisplayValue(target);
      return;
    }

    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;

        observer.disconnect();
        const startedAt = performance.now();
        const duration = 900;

        const animate = (now: number) => {
          const progress = Math.min((now - startedAt) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplayValue(target * eased);
          if (progress < 1) frame = requestAnimationFrame(animate);
        };

        frame = requestAnimationFrame(animate);
      },
      { threshold: 0.35 }
    );

    observer.observe(elementRef.current);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [target]);

  return (
    <span ref={elementRef}>
      {displayValue === null ? value : displayValue.toFixed(decimals)}
    </span>
  );
}
