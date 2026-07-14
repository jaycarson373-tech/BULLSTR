"use client";

import { useEffect } from "react";

export function AppPolish() {
  useEffect(() => {
    const updateScrolled = () => {
      document.documentElement.classList.toggle("is-scrolled", window.scrollY > 12);
      document.documentElement.style.setProperty("--scroll-y", `${window.scrollY}px`);
    };

    updateScrolled();
    window.addEventListener("scroll", updateScrolled, { passive: true });

    return () => window.removeEventListener("scroll", updateScrolled);
  }, []);

  useEffect(() => {
    const selector = ".ai-section, .ai-card, .ai-holding-card, .ai-table, .ai-thesis, .ai-performance-card, .ai-terminal, .ai-faq details";
    const elements = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 }
    );

    const observe = () => {
      document.querySelectorAll(selector).forEach((element) => {
        if (!elements.has(element)) {
          elements.add(element);
          observer.observe(element);
        }
      });
    };

    observe();
    const mutationObserver = new MutationObserver(observe);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const canAnimate = window.matchMedia("(pointer: fine) and (min-width: 900px)").matches;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!canAnimate || reduceMotion) return;

    let frame = 0;
    const updatePointer = (event: PointerEvent) => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const x = ((event.clientX / window.innerWidth) - 0.5) * 18;
        const y = ((event.clientY / window.innerHeight) - 0.5) * 14;
        document.documentElement.style.setProperty("--mouse-x", `${x.toFixed(2)}px`);
        document.documentElement.style.setProperty("--mouse-y", `${y.toFixed(2)}px`);
      });
    };

    window.addEventListener("pointermove", updatePointer, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", updatePointer);
      document.documentElement.style.removeProperty("--mouse-x");
      document.documentElement.style.removeProperty("--mouse-y");
    };
  }, []);

  return null;
}
