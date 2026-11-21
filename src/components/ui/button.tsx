import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils.ts'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full font-extrabold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/50',
  {
    variants: {
      variant: {
        default: 'bg-gold text-pine shadow-[0_10px_24px_rgba(255,194,14,0.35)] hover:bg-gold-deep',
        secondary: 'bg-white text-pine shadow-[0_8px_24px_rgba(20,48,40,0.06)] ring-1 ring-line hover:bg-gold-soft',
        ghost: 'bg-transparent text-pine hover:bg-white/70',
        sale: 'bg-sale text-white hover:opacity-90',
        pine: 'bg-pine text-gold shadow-soft hover:bg-leaf',
      },
      size: {
        default: 'h-12 px-5 text-base',
        lg: 'h-14 px-6 text-lg',
        sm: 'h-10 px-4 text-sm',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
