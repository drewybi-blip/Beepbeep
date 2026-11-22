function starPath(points: number, outerRadius: number) {
  const innerRadius = (outerRadius * 4) / 9
  let path = ''
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius
    const angle = -Math.PI / 2 + (i * Math.PI) / points
    const x = (radius * Math.cos(angle)).toFixed(2)
    const y = (radius * Math.sin(angle)).toFixed(2)
    path += `${i === 0 ? 'M' : 'L'}${x},${y}`
  }
  return `${path}Z`
}

const commonwealth = starPath(7, 1134)
const southernSeven = starPath(7, 540)
const southernFive = starPath(5, 315)

/** Australian National Flag, built from the Flags Act proportions. */
export function AustralianFlag({ className = 'h-[18px] w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 15120 7560" className={className} aria-hidden="true">
      <defs>
        <clipPath id="au-canton">
          <rect width="600" height="300" />
        </clipPath>
        <clipPath id="au-saltire">
          <path d="M300,150 h300 v150 z v150 h-300 z h-300 v-150 z v-150 h300 z" />
        </clipPath>
        <g id="au-jack" fill="none" clipPath="url(#au-canton)">
          <path d="M0,0 L600,300 M600,0 L0,300" stroke="#fff" strokeWidth="60" />
          <path d="M0,0 L600,300 M600,0 L0,300" stroke="#E4002B" strokeWidth="40" clipPath="url(#au-saltire)" />
          <path d="M300,0 V300 M0,150 H600" stroke="#fff" strokeWidth="100" />
          <path d="M300,0 V300 M0,150 H600" stroke="#E4002B" strokeWidth="60" />
        </g>
      </defs>
      <rect width="15120" height="7560" fill="#012169" />
      <use href="#au-jack" transform="scale(12.6)" />
      <g fill="#fff">
        <path d={commonwealth} transform="translate(3780 5670)" />
        <path d={southernSeven} transform="translate(11340 6300)" />
        <path d={southernSeven} transform="translate(9450 3307.5)" />
        <path d={southernSeven} transform="translate(11340 1260)" />
        <path d={southernSeven} transform="translate(13020 2803.5)" />
        <path d={southernFive} transform="translate(12096 4095)" />
      </g>
    </svg>
  )
}
