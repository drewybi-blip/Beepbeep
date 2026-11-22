import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from './icons.tsx'
import { Logo } from './Wordmark.tsx'
import { SoundToggle } from './SoundToggle.tsx'

export function TopBar({ back = false, extra }: { back?: boolean; extra?: ReactNode }) {
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 bg-paper/80 px-4 backdrop-blur-md">
      {back ? (
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-pine shadow-soft"
          aria-label="Back"
        >
          <Icon name="back" size={22} />
        </button>
      ) : null}
      <Logo />
      <div className="ml-auto flex items-center gap-2">
        {extra}
        <SoundToggle />
      </div>
    </header>
  )
}
