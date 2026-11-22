import * as Dialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  onOpenAutoFocus,
  onCloseAutoFocus,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  onOpenAutoFocus?: (event: Event) => void
  onCloseAutoFocus?: (event: Event) => void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-pine/40" />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[88dvh] w-full max-w-[480px] overflow-auto rounded-t-[28px] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl focus:outline-none"
          onOpenAutoFocus={onOpenAutoFocus}
          onCloseAutoFocus={onCloseAutoFocus}
        >
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line" />
          <Dialog.Title className="text-2xl font-extrabold tracking-tight text-ink">{title}</Dialog.Title>
          {description ? <Dialog.Description className="mt-1 text-sm font-semibold text-muted">{description}</Dialog.Description> : null}
          <div className="mt-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
