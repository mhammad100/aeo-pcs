type BrandMarkProps = {
  size?: number;
  className?: string;
  title?: string;
  /** dark = navy tile (default); outline = light tile; onDark = translucent on deep navy */
  variant?: "dark" | "outline" | "onDark";
  showM?: boolean;
};

/** Master AEO icon: navy tile, white M stroke, teal signal dot. */
export default function BrandMark({
  size = 40,
  className,
  title = "Master AEO",
  variant = "dark",
  showM = true,
}: BrandMarkProps) {
  const NAVY = "#16233E";
  const TEAL = "#14B8A6";
  const WHITE = "#FFFFFF";

  let tileFill = NAVY;
  let tileStroke = "none";
  let tileStrokeWidth = 0;
  let mStroke = WHITE;

  if (variant === "outline") {
    tileFill = WHITE;
    tileStroke = NAVY;
    tileStrokeWidth = 4;
    mStroke = NAVY;
  } else if (variant === "onDark") {
    tileFill = "rgba(255,255,255,0.10)";
    tileStroke = "rgba(255,255,255,0.22)";
    tileStrokeWidth = 2;
    mStroke = WHITE;
  }

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      style={{ display: "block", flexShrink: 0 }}
    >
      <rect
        x="6"
        y="6"
        width="88"
        height="88"
        rx="20"
        fill={tileFill}
        stroke={tileStroke}
        strokeWidth={tileStrokeWidth}
      />
      {showM ? (
        <polyline
          points="26,74 26,26 50,54 74,26 74,74"
          fill="none"
          stroke={mStroke}
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      <circle cx="88" cy="8" r="10" fill={TEAL} />
    </svg>
  );
}
