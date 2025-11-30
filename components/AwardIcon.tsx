interface AwardIconProps {
  className?: string;
  title?: string;
}

export default function AwardIcon({ className = "", title = "Award recipient" }: AwardIconProps) {
  return (
    <span title={title} className={`inline-block ${className}`}>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFD619" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {/* Ribbon top */}
        <rect x="7" y="2" width="10" height="4" rx="1" />
        {/* Ribbon tails */}
        <path d="M7 6v4l2.5-2L7 6z" />
        <path d="M17 6v4l-2.5-2L17 6z" />
        {/* Medal circle */}
        <circle cx="12" cy="15" r="5" />
        {/* Star in medal */}
        <path d="M12 12l1 2h2l-1.5 1.5.5 2.5-2-1.5-2 1.5.5-2.5L9 14h2z" />
      </svg>
    </span>
  );
}
