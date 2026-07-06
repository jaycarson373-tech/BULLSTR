"use client";

import type { CSSProperties } from "react";

const tickerRows = Array.from({ length: 8 }, (_, index) => index);
const codeColumns = Array.from({ length: 18 }, (_, index) => index);
const coins = [
  { x: "7%", y: "18%", size: 82, delay: "-2s", duration: "18s", blur: "0px", opacity: 0.34 },
  { x: "84%", y: "14%", size: 64, delay: "-7s", duration: "21s", blur: "1px", opacity: 0.28 },
  { x: "69%", y: "42%", size: 110, delay: "-11s", duration: "24s", blur: "2px", opacity: 0.2 },
  { x: "16%", y: "68%", size: 58, delay: "-5s", duration: "20s", blur: "1px", opacity: 0.24 },
  { x: "91%", y: "72%", size: 92, delay: "-14s", duration: "26s", blur: "3px", opacity: 0.18 },
  { x: "43%", y: "78%", size: 72, delay: "-9s", duration: "23s", blur: "1px", opacity: 0.22 }
];

export function AnimatedBackground() {
  return (
    <div className="index-animated-bg" aria-hidden="true">
      <div className="index-matrix">
        {codeColumns.map((column) => (
          <span key={column} style={{ "--column": column } as CSSProperties}>
            {column % 3 === 0 ? "6900 6900 6900" : column % 3 === 1 ? "INDEX INDEX INDEX" : "+6900% +6900%"}
          </span>
        ))}
      </div>
      <div className="index-ticker-wall">
        {tickerRows.map((row) => (
          <span key={row}>+6900% ANSEM INDEX +6900% $AI6900 +6900% ANSEM INDEX +6900% $AI6900</span>
        ))}
      </div>
      <div className="index-chart-glow">
        <svg viewBox="0 0 1200 520" preserveAspectRatio="none">
          <path d="M0 420 C160 360 260 385 380 308 C505 226 610 276 742 185 C890 84 1012 122 1200 52" />
          <path d="M0 492 C120 438 255 454 410 382 C565 310 610 318 760 230 C905 146 1030 151 1200 96" />
        </svg>
      </div>
      <div className="index-arrow-field">
        {Array.from({ length: 10 }, (_, index) => (
          <span
            key={index}
            style={
              {
                "--left": `${index * 13 - 8}%`,
                "--arrow-duration": `${13 + index * 0.7}s`,
                "--arrow-delay": `${index * -1.6}s`
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="index-coin-field">
        {coins.map((coin, index) => (
          <span
            className={index % 2 === 0 ? "index-floating-coin" : "index-floating-coin is-dark"}
            key={`${coin.x}-${coin.y}`}
            style={
              {
                "--x": coin.x,
                "--y": coin.y,
                "--size": `${coin.size}px`,
                "--delay": coin.delay,
                "--duration": coin.duration,
                "--blur": coin.blur,
                "--opacity": coin.opacity
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="index-bg-shade" />
    </div>
  );
}
