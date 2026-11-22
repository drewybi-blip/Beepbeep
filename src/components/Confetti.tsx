const BITS = [
  { left: '8%', color: '#ffcd00', delay: '0s' },
  { left: '18%', color: '#00843d', delay: '0.05s' },
  { left: '30%', color: '#ffb81c', delay: '0.1s' },
  { left: '44%', color: '#00573f', delay: '0s' },
  { left: '56%', color: '#ffcd00', delay: '0.08s' },
  { left: '68%', color: '#00843d', delay: '0.12s' },
  { left: '80%', color: '#ffb81c', delay: '0.04s' },
  { left: '90%', color: '#00573f', delay: '0.16s' },
]

export function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {BITS.map((bit) => (
        <span
          key={bit.left}
          className="confetti-bit absolute top-0 h-3 w-2 rounded-sm"
          style={{ left: bit.left, background: bit.color, animationDelay: bit.delay }}
        />
      ))}
    </div>
  )
}
