import type { CSSProperties } from "react";

const scenes = [
  { image: "/brand/bullstr-logo.png", className: "is-hero" },
  { image: "/brand/black-bull-logo.png", className: "is-bull" },
  { image: "/brand/bull-hero.png", className: "is-vortex" },
  { image: "/brand/ansem-black-bull.jpg", className: "is-mountains" }
];

export function AnimatedBackground() {
  return (
    <div className="index-animated-bg" aria-hidden="true">
      <div className="index-bg-tape">
        <span>BULLSTR 50/50 BEGGING CODED BULLSTR 50/50 BEGGING CODED</span>
        <span>BULLSTR 50/50 BEGGING CODED BULLSTR 50/50 BEGGING CODED</span>
        <span>BULLSTR 50/50 BEGGING CODED BULLSTR 50/50 BEGGING CODED</span>
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
