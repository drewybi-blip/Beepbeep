import { useNavigate } from 'react-router-dom'
import { Icon } from './icons.tsx'
import { SoundToggle } from './SoundToggle.tsx'
import { Wordmark } from './Wordmark.tsx'

export function TopBar({ back = false, title }: { back?: boolean; title?: string }) {
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 bg-paper/80 px-4 backdrop-blur-md">
      {back ? (
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="press flex h-10 w-10 items-center justify-center rounded-full bg-white text-pine shadow-soft"
          aria-label="Back"
        >
          <Icon name="back" size={22} />
        </button>
      ) : null}
      {title ? <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1> : <Wordmark />}
      <SoundToggle />
    </header>
  )
}
