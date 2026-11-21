import { useEffect, useState } from 'react'

type PromptEvent = Event & { prompt: () => Promise<void> }

export function InstallHint() {
  const [prompt, setPrompt] = useState<PromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const ios = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
    setInstalled(standalone)
    setHidden(localStorage.getItem('shopmate.install.dismissed') === '1')
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setPrompt(event as PromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (installed || hidden) return null

  return (
    <section className="rounded-[28px] bg-white p-4 shadow-[0_10px_28px_rgba(20,48,40,0.06)]">
      <p className="sticker bg-mint px-3 py-1 text-xs font-black uppercase tracking-wide text-pine">Add BeepBeep to Home Screen</p>
      {prompt ? (
        <button
          type="button"
          className="mt-3 w-full rounded-full bg-gold px-4 py-3 text-base font-black text-pine"
          onClick={() => void prompt.prompt()}
        >
          Install BeepBeep
        </button>
      ) : (
        <p className="mt-3 text-sm font-semibold leading-relaxed text-ink">
          {ios
            ? 'On iPhone, tap the Share button in Safari, then Add to Home Screen. The list and in-store ticks keep working without reception.'
            : 'On Android, open the Chrome menu and choose Install app or Add to Home screen. The list keeps working offline once it’s installed.'}
        </p>
      )}
      <button
        type="button"
        className="mt-2 text-xs font-bold text-muted"
        onClick={() => {
          localStorage.setItem('shopmate.install.dismissed', '1')
          setHidden(true)
        }}
      >
        Not now
      </button>
    </section>
  )
}
