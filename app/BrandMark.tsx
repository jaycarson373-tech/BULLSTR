type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className = "" }: BrandMarkProps) {
  return (
    <span className={`brand-mark ${className}`} aria-hidden="true">
      <span className="brand-mark-orbit" />
      <span className="brand-mark-diamond">
        <i />
        <i />
        <i />
      </span>
      <span className="brand-mark-hands" />
    </span>
  );
}
