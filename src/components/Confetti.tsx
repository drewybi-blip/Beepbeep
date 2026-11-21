const BITS = [
  { left: '8%', color: '#ffc20e', delay: '0s', rotate: '-12deg' },
  { left: '18%', color: '#c6f54a', delay: '0.05s', rotate: '8deg' },
  { left: '30%', color: '#ff7a3c', delay: '0.1s', rotate: '-6deg' },
  { left: '44%', color: '#ff5d8f', delay: '0s', rotate: '14deg' },
  { left: '56%', color: '#7de2c4', delay: '0.08s', rotate: '-8deg' },
  { left: '68%', color: '#ffc20e', delay: '0.12s', rotate: '6deg' },
  { left: '80%', color: '#ff7a3c', delay: '0.04s', rotate: '-14deg' },
  { left: '90%', color: '#c6f54a', delay: '0.16s', rotate: '10deg' },
]

export function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {BITS.map((bit) => (
        <span
          key={bit.left}
          className="confetti-bit absolute top-0 h-3 w-2 rounded-sm"
          style={{ left: bit.left, background: bit.color, animationDelay: bit.delay, transform: `rotate(${bit.rotate})` }}
        />
      ))}
    </div>
  )
}
