export function Mark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="18" fill="#00843D" />
      <rect x="10" y="12" width="44" height="32" rx="12" fill="#FFCD00" />
      <rect x="18" y="38" width="12" height="12" rx="3" fill="#FFCD00" />
      <rect x="22" y="20" width="6" height="16" rx="3" fill="#00843D" />
      <rect x="34" y="20" width="6" height="16" rx="3" fill="#00573F" />
    </svg>
  )
}

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2">
      <Mark className="h-9 w-9" />
      <span className="font-display text-[1.35rem] font-extrabold tracking-tight text-pine">
        Beep<span className="text-gold-deep">Beep</span>
      </span>
    </span>
  )
}
