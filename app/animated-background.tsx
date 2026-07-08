import type { CSSProperties } from "react";

const scenes = [
  { image: "/brand/begwork-icon.png", className: "is-hero" },
  { image: "/brand/black-bull-logo.png", className: "is-bull" },
  { image: "/brand/bull-hero.png", className: "is-vortex" },
  { image: "/brand/ansem-black-bull.jpg", className: "is-mountains" }
];

export function AnimatedBackground() {
  return (
    <div className="index-animated-bg" aria-hidden="true">
      <div className="index-bg-tape">
        <span>Begwork 50/50 ANSEM REWARDS Begwork 50/50 REWARD WALLET</span>
        <span>Begwork 50/50 ANSEM REWARDS Begwork 50/50 REWARD WALLET</span>
        <span>Begwork 50/50 ANSEM REWARDS Begwork 50/50 REWARD WALLET</span>
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
