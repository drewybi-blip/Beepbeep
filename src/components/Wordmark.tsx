export function Mark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="20" fill="#FFC20E" />
      <rect x="14" y="26" width="6" height="16" rx="2" fill="#0E3B2E" />
      <rect x="23" y="18" width="5" height="28" rx="2" fill="#0E3B2E" />
      <path d="M36 24c4 3 4 13 0 16" fill="none" stroke="#0E3B2E" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M42 18c7 5 7 23 0 28" fill="none" stroke="#0E3B2E" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  )
}

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2">
      <Mark className="h-9 w-9 -rotate-6" />
      <span className="text-[1.35rem] font-black tracking-tight text-pine">
        Beep<span className="text-gold-ink">Beep</span>
      </span>
    </span>
  )
}
