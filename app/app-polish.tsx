"use client";

import { useEffect, useState } from "react";

export function AppPolish() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const reveal = () => {
      setLeaving(true);
      window.setTimeout(() => setVisible(false), 360);
    };

    const timer = window.setTimeout(reveal, 1100);
    return () => window.clearTimeout(timer);
  }, []);

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

  if (!visible) return null;

  return (
    <div className={`loading-screen${leaving ? " is-leaving" : ""}`}>
      <div className="loader-index-mark" aria-hidden="true">
        <img src="/brand/ai6900-logo.png" alt="" />
      </div>
      <div className="loader-text">ANSEM INDEX 6900</div>
      <div className="loader-line" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}
