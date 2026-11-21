import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Wordmark } from './Wordmark.tsx'

export function TopBar({ back = false, title }: { back?: boolean; title?: string }) {
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 bg-paper/90 px-4 backdrop-blur">
      {back ? (
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-pine shadow-sm ring-1 ring-line"
          aria-label="Back"
        >
          <ChevronLeft />
        </button>
      ) : null}
      {title ? <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1> : <Wordmark />}
    </header>
  )
}
