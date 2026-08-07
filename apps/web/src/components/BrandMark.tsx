type BrandMarkProps = {
  size?: number;
  className?: string;
  title?: string;
};

/** Master AEO icon: navy tile, white M stroke, teal signal dot. */
export default function BrandMark({ size = 40, className, title = "Master AEO" }: BrandMarkProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <rect x="6" y="6" width="88" height="88" rx="20" fill="#16233E" />
      <polyline
        points="26,74 26,26 50,54 74,26 74,74"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="88" cy="8" r="10" fill="#14B8A6" />
    </svg>
  );
}
