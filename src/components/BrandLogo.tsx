import Link from "next/link";

interface BrandLogoProps {
  href?: string;
  size?: "sm" | "md" | "lg";
  inverted?: boolean;
  showTagline?: boolean;
}

export function BrandMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="60" height="60" rx="15" fill="#1E3A8A" />
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="13"
        stroke="rgba(147,197,253,0.28)"
        strokeWidth="1.5"
      />
      {/* Notebook card */}
      <rect x="14" y="12" width="36" height="40" rx="5" fill="#FFFFFF" />
      {/* Spine */}
      <path
        d="M14 17C14 14.2386 16.2386 12 19 12H21V52H19C16.2386 52 14 49.7614 14 47V17Z"
        fill="#DBEAFE"
      />
      {/* Binding dots */}
      <circle cx="17.5" cy="21" r="1.6" fill="#1E3A8A" />
      <circle cx="17.5" cy="32" r="1.6" fill="#1E3A8A" />
      <circle cx="17.5" cy="43" r="1.6" fill="#1E3A8A" />
      {/* Ledger lines */}
      <line x1="25" y1="20" x2="45" y2="20" stroke="#E5E7EB" strokeWidth="2" strokeLinecap="round" />
      <line x1="25" y1="44" x2="45" y2="44" stroke="#E5E7EB" strokeWidth="2" strokeLinecap="round" />
      {/* Loss dip + Profit upward chart */}
      <path
        d="M25 34L30 39"
        stroke="#DC2626"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M30 39L36 31L45 24"
        stroke="#16A34A"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="45" cy="24" r="2.6" fill="#16A34A" />
    </svg>
  );
}

export function BrandLogo({
  href = "/",
  size = "md",
  inverted = false,
  showTagline = false,
}: BrandLogoProps) {
  const markSize =
    size === "sm" ? "h-8 w-8" : size === "lg" ? "h-11 w-11" : "h-9 w-9";
  const textSize =
    size === "sm" ? "text-lg" : size === "lg" ? "text-2xl" : "text-xl";

  const content = (
    <span className="inline-flex items-center gap-2.5 select-none">
      <BrandMark className={`${markSize} shrink-0 shadow-sm`} />
      <span className="flex flex-col leading-tight">
        <span className={`font-heading font-extrabold tracking-tight ${textSize}`}>
          <span className={inverted ? "text-emerald-400" : "text-[#16A34A]"}>
            PnL
          </span>{" "}
          <span className={inverted ? "text-white" : "text-[#111827]"}>
            Diary
          </span>
        </span>
        {showTagline && (
          <span
            className={`text-[11px] font-medium ${
              inverted ? "text-blue-200" : "text-slate-500"
            }`}
          >
            Catat PnL harianmu, di mana saja.
          </span>
        )}
      </span>
    </span>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A]"
    >
      {content}
    </Link>
  );
}

