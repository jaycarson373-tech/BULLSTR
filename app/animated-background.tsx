"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

const tickerRows = Array.from({ length: 8 }, (_, index) => index);
const codeColumns = Array.from({ length: 18 }, (_, index) => index);
const scenes = [
  { image: "/brand/backgrounds/ai6900-bg-2.jpg", top: "-4%", height: "34%", x: "68%", y: "8%", scale: 1.12, opacity: 0.78, blur: "2px", drift: "28s" },
  { image: "/brand/backgrounds/ai6900-bg-6.jpg", top: "11%", height: "34%", x: "18%", y: "8%", scale: 1.08, opacity: 0.68, blur: "2px", drift: "32s" },
  { image: "/brand/backgrounds/ai6900-bg-3.jpg", top: "28%", height: "34%", x: "72%", y: "10%", scale: 1.1, opacity: 0.7, blur: "2px", drift: "36s" },
  { image: "/brand/backgrounds/ai6900-bg-1.jpg", top: "45%", height: "34%", x: "18%", y: "8%", scale: 1.08, opacity: 0.66, blur: "3px", drift: "30s" },
  { image: "/brand/backgrounds/ai6900-bg-4.jpg", top: "62%", height: "35%", x: "74%", y: "10%", scale: 1.1, opacity: 0.72, blur: "2px", drift: "38s" },
  { image: "/brand/backgrounds/ai6900-bg-5.jpg", top: "77%", height: "35%", x: "28%", y: "10%", scale: 1.1, opacity: 0.7, blur: "2px", drift: "34s" }
];
const coins = [
  { x: "7%", y: "18%", size: 82, delay: "-2s", duration: "18s", blur: "0px", opacity: 0.34 },
  { x: "84%", y: "14%", size: 64, delay: "-7s", duration: "21s", blur: "1px", opacity: 0.28 },
  { x: "69%", y: "42%", size: 110, delay: "-11s", duration: "24s", blur: "2px", opacity: 0.2 },
  { x: "16%", y: "68%", size: 58, delay: "-5s", duration: "20s", blur: "1px", opacity: 0.24 },
  { x: "91%", y: "72%", size: 92, delay: "-14s", duration: "26s", blur: "3px", opacity: 0.18 },
  { x: "43%", y: "78%", size: 72, delay: "-9s", duration: "23s", blur: "1px", opacity: 0.22 }
];

export function AnimatedBackground() {
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const update = (event: PointerEvent) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 2;
      const y = (event.clientY / window.innerHeight - 0.5) * 2;
      setParallax({ x: Number(x.toFixed(3)), y: Number(y.toFixed(3)) });
    };

    window.addEventListener("pointermove", update, { passive: true });
    return () => window.removeEventListener("pointermove", update);
  }, []);

  return (
    <div className="index-animated-bg" aria-hidden="true">
      <div className="index-art-scenes">
        {scenes.map((scene, index) => (
          <span
            className="index-art-scene"
            key={scene.image}
            style={
              {
                "--scene-top": scene.top,
                "--scene-height": scene.height,
                "--scene-x": scene.x,
                "--scene-y": scene.y,
                "--scene-scale": scene.scale,
                "--scene-opacity": scene.opacity,
                "--scene-blur": scene.blur,
                "--scene-drift": scene.drift,
                "--scene-depth": 5 + index * 3,
                "--scene-delay": `${index * -5}s`,
                "--scene-move-x": `${parallax.x * (5 + index * 3)}px`,
                "--scene-move-y": `${parallax.y * (4 + index * 2)}px`,
                backgroundImage: `radial-gradient(circle at ${scene.x} ${scene.y}, rgba(124, 255, 59, 0.28), transparent 30%), url("${scene.image}")`
              } as CSSProperties
            }
          />
        ))}
      </div>
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
