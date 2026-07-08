import type { CSSProperties } from "react";

const scenes = [
  { image: "/brand/robin-hood-hero.jpg", className: "is-hero" },
  { image: "/brand/robin-hood-logo.jpg", className: "is-bull" },
  { image: "/brand/grass-hero.webp", className: "is-vortex" },
  { image: "/brand/grass-logo.webp", className: "is-mountains" }
];

export function AnimatedBackground() {
  return (
    <div className="index-animated-bg" aria-hidden="true">
      <div className="index-bg-tape">
        <span>HOOD 6900 HOODX STOCK REWARDS ROBINHOOD CODED</span>
        <span>HOOD 6900 HOODX STOCK REWARDS ROBINHOOD CODED</span>
        <span>HOOD 6900 HOODX STOCK REWARDS ROBINHOOD CODED</span>
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
