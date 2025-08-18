interface DocumentIconProps {
  className?: string;
  title?: string;
}

export default function DocumentIcon({ className = "", title = "Memorial document available" }: DocumentIconProps) {
  return (
    <span title={title} className={`inline-block ${className}`}>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-file-text">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="9" y2="9" />
      </svg>
    </span>
  );
}
