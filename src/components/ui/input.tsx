import type { ComponentProps } from 'react'
import { cn } from '../../lib/utils.ts'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-14 w-full rounded-full bg-paper px-5 text-base font-bold text-ink outline-none ring-1 ring-line placeholder:font-semibold placeholder:text-muted focus:ring-2 focus:ring-gold',
        className,
      )}
      {...props}
    />
  )
}
