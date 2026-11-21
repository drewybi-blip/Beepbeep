export function Mark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="18" fill="#FFC20E" />
      <path d="M20 28h24l-2 20H22z" fill="#0E3B2E" />
      <path d="M26 28c0-6 3.2-10 6-10s6 4 6 10" fill="none" stroke="#0E3B2E" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="32" cy="38" r="3" fill="#FFC20E" />
    </svg>
  )
}

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2">
      <Mark />
      <span className="text-[1.35rem] font-extrabold tracking-tight text-pine">
        Shop<span className="text-gold-ink">Mate</span>
      </span>
    </span>
  )
}
