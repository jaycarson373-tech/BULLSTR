import type { CSSProperties } from "react";

const scenes = [
  { image: "/brand/backgrounds/hood6900-bg-1.jpg", className: "is-hero" },
  { image: "/brand/backgrounds/hood6900-bg-2.jpg", className: "is-matrix" },
  { image: "/brand/backgrounds/hood6900-bg-3.jpg", className: "is-chart" },
  { image: "/brand/backgrounds/hood6900-bg-4.jpg", className: "is-city" },
  { image: "/brand/backgrounds/hood6900-bg-5.jpg", className: "is-vortex" },
  { image: "/brand/backgrounds/hood6900-bg-6.jpg", className: "is-grid" },
  { image: "/brand/backgrounds/hood6900-bg-7.jpg", className: "is-rain" },
  { image: "/brand/backgrounds/hood6900-bg-8.jpg", className: "is-warp" },
  { image: "/brand/backgrounds/hood6900-bg-9.jpg", className: "is-lightning" }
];

export function AnimatedBackground() {
  return (
    <div className="index-animated-bg" aria-hidden="true">
      <div className="index-bg-tape">
        <span>THE MEMECOIN OF THE HOOD</span>
        <span>ROBINHOOD HAS HOODX HOOD6900 HAS THE MEME</span>
        <span>HOLD 100K STAY ELIGIBLE</span>
      </div>
      <div className="index-bg-images">
        {scenes.map((scene) => (
          <span
            className={`index-bg-image ${scene.className}`}
            key={scene.image}
            style={{ backgroundImage: `url("${scene.image}")` } as CSSProperties}
          />
        ))}
      </div>
      <div className="index-bg-vignette" />
    </div>
  );
}
