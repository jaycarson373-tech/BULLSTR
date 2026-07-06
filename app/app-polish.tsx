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
    const selector = ".section, .card, .stat, .history-card, .metric-card, .flow-step, .multiplier-card, .reset-warning-card, .reward-flow-card, .share-card, .path-card, .black-bull-card, .eligibility-card, .philosophy-card, .conviction-card, .warning-card, .lookup-card, .faq-item";
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
      <div className="loader-mascot">
        <span>A</span>
      </div>
      <div className="loader-text">Ansemification</div>
      <div className="loader-line" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}
