export type FoodShot = {
  id: string
  alt: string
  caption: string
  width: number
  height: number
}

/** Studio shots made for BeepBeep. No supermarket brands. See CREDITS.md. */
export const FOOD: FoodShot[] = [
  { id: 'still-life', alt: 'Tomatoes, basil, a lemon, rosemary and a crusty loaf', caption: 'The sunny pile', width: 1152, height: 864 },
  { id: 'tomatoes', alt: 'Ripe tomatoes and basil leaves', caption: 'Tomatoes and basil', width: 1024, height: 1024 },
  { id: 'bread', alt: 'A floury sourdough loaf', caption: 'Crusty loaf', width: 1024, height: 1024 },
  { id: 'herbs', alt: 'A bunch of basil, parsley and rosemary', caption: 'Herb bunch', width: 1024, height: 1024 },
  { id: 'penne', alt: 'An unbranded packet of penne', caption: 'Penne, no logo', width: 864, height: 1152 },
  { id: 'spaghetti', alt: 'An unbranded packet of spaghetti', caption: 'Spaghetti, plain and proud', width: 864, height: 1152 },
]

export const HERO_FOOD = ['tomatoes', 'bread', 'herbs']

export function foodSrc(id: string, size: 480 | 960) {
  return `/food/${id}-${size}.webp`
}

export function foodSrcSet(id: string) {
  return `${foodSrc(id, 480)} 480w, ${foodSrc(id, 960)} 960w`
}
