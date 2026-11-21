import type { ReactNode } from 'react'

export type IconName =
  | 'scan'
  | 'basket'
  | 'list'
  | 'tick'
  | 'tag'
  | 'fire'
  | 'star'
  | 'store'
  | 'sound'
  | 'heart'
  | 'fruit'
  | 'dairy'
  | 'meat'
  | 'bakery'
  | 'drinks'
  | 'chemist'
  | 'household'
  | 'pet'
  | 'baby'
  | 'booze'
  | 'back'

export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {glyphs[name]}
    </svg>
  )
}

const stroke = {
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const glyphs: Record<IconName, ReactNode> = {
  scan: (
    <>
      <path d="M7 11V8h4M21 8h4v3M25 21v3h-4M11 24H7v-3" {...stroke} />
      <path d="M10 16h2M15 12v8M19 14v4M22 16h1" {...stroke} />
    </>
  ),
  basket: (
    <>
      <path d="M6 12h20l-2 12H8L6 12z" {...stroke} />
      <path d="M12 12c0-4 2-6 4-6s4 2 4 6" {...stroke} />
      <circle cx="13" cy="18" r="1.2" fill="#FFC20E" />
    </>
  ),
  list: (
    <>
      <path d="M8 8h16v16H8z" {...stroke} />
      <path d="M12 13h8M12 17h8M12 21h5" {...stroke} />
    </>
  ),
  tick: (
    <>
      <circle cx="16" cy="16" r="9" {...stroke} />
      <path d="M11 16.5l3 3 7-7" {...stroke} />
    </>
  ),
  tag: (
    <>
      <path d="M6 16L16 6h8v8L14 24 6 16z" {...stroke} />
      <circle cx="20" cy="12" r="1.4" fill="#FFC20E" />
    </>
  ),
  fire: (
    <path d="M16 6c2 4 1 6 1 6s3-1 4 3c2 5-2 11-5 11s-7-4-6-9c1-3 3-4 3-4s0 3 3 3c0-4-1-7 0-10z" {...stroke} />
  ),
  star: (
    <path d="M16 6l2.4 6.2H25l-5.2 3.8 2 6.2L16 19.2 10.2 22l2-6.2L7 12.2h6.6L16 6z" {...stroke} />
  ),
  store: (
    <>
      <path d="M6 13l2-5h16l2 5" {...stroke} />
      <path d="M6 13v11h20V13" {...stroke} />
      <path d="M13 24v-6h6v6" {...stroke} />
    </>
  ),
  sound: (
    <>
      <path d="M8 13h4l6-4v14l-6-4H8z" {...stroke} />
      <path d="M22 13c2 1.5 2 4.5 0 6M25 10c3 2.5 3 9.5 0 12" {...stroke} />
    </>
  ),
  heart: (
    <path d="M16 26s-8-5-10-10c-1.5-3.5.5-7 4-7 2 0 3.2 1 4 2.2C14.8 10 16 9 18 9c3.5 0 5.5 3.5 4 7-2 5-6 10-6 10z" {...stroke} />
  ),
  fruit: (
    <>
      <circle cx="16" cy="18" r="7" {...stroke} />
      <path d="M16 11c1-3 4-4 6-3" {...stroke} />
    </>
  ),
  dairy: (
    <>
      <path d="M12 8h8l2 4v12H10V12l2-4z" {...stroke} />
      <path d="M12 14h10" {...stroke} />
    </>
  ),
  meat: (
    <path d="M10 18c0-5 4-8 8-8 5 0 8 3 8 6 0 4-3 6-6 6-1 2-3 4-6 4-3 0-4-3-4-8z" {...stroke} />
  ),
  bakery: (
    <>
      <path d="M8 18c0-4 3-7 8-7s8 3 8 7v6H8v-6z" {...stroke} />
      <path d="M8 18h16" {...stroke} />
    </>
  ),
  drinks: (
    <>
      <path d="M12 8h8l-1 16H13L12 8z" {...stroke} />
      <path d="M11 24h10" {...stroke} />
    </>
  ),
  chemist: (
    <>
      <rect x="9" y="10" width="14" height="12" rx="6" {...stroke} />
      <path d="M16 13v6M13 16h6" {...stroke} />
    </>
  ),
  household: (
    <>
      <path d="M14 8h4l1 6H13l1-6z" {...stroke} />
      <path d="M12 14h8l1 10H11l1-10z" {...stroke} />
    </>
  ),
  pet: (
    <>
      <circle cx="10" cy="12" r="2" {...stroke} />
      <circle cx="16" cy="10" r="2" {...stroke} />
      <circle cx="22" cy="12" r="2" {...stroke} />
      <ellipse cx="16" cy="20" rx="5" ry="4" {...stroke} />
    </>
  ),
  baby: (
    <>
      <circle cx="16" cy="14" r="5" {...stroke} />
      <path d="M10 26c1-4 3-6 6-6s5 2 6 6" {...stroke} />
    </>
  ),
  booze: (
    <>
      <path d="M13 6h6v6c3 1 4 4 4 6v2H9v-2c0-2 1-5 4-6V6z" {...stroke} />
      <path d="M12 26h8" {...stroke} />
    </>
  ),
  back: <path d="M19 8l-8 8 8 8" {...stroke} />,
}

export const PANTRY = [
  { id: 'fruit', label: 'Fruit & veg', icon: 'fruit' },
  { id: 'dairy', label: 'Dairy', icon: 'dairy' },
  { id: 'meat', label: 'Meat', icon: 'meat' },
  { id: 'bakery', label: 'Bakery', icon: 'bakery' },
  { id: 'drinks', label: 'Drinks', icon: 'drinks' },
  { id: 'chemist', label: 'Chemist', icon: 'chemist' },
  { id: 'household', label: 'Household', icon: 'household' },
  { id: 'pet', label: 'Pet', icon: 'pet' },
  { id: 'baby', label: 'Baby', icon: 'baby' },
  { id: 'booze', label: 'Booze', icon: 'booze' },
] as const
