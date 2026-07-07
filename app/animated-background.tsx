import type { CSSProperties } from "react";

const scenes = [
  { image: "/brand/backgrounds/ai6900-live-2.jpg", className: "is-hero" },
  { image: "/brand/backgrounds/ai6900-live-1.jpg", className: "is-bull" },
  { image: "/brand/backgrounds/ai6900-live-3.jpg", className: "is-vortex" },
  { image: "/brand/backgrounds/ai6900-live-4.jpg", className: "is-mountains" }
];

export function AnimatedBackground() {
  return (
    <div className="index-animated-bg" aria-hidden="true">
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
