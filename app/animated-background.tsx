export function AnimatedBackground() {
  return (
    <div className="index-animated-bg strategy-bg" aria-hidden="true">
      <div className="strategy-bg-grid" />
      <div className="strategy-bg-mountains" />
      <div className="strategy-bg-chart" />
      <div className="strategy-bg-particles">
        {Array.from({ length: 18 }).map((_, index) => (
          <span key={index} />
        ))}
      </div>
      <div className="index-bg-vignette" />
    </div>
  );
}
