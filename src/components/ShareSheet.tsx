import { useEffect, useState } from 'react'
import { Icon } from './icons.tsx'
import { Sheet } from './ui/dialog.tsx'
import { allowsAdds, listId, publishList, setAllowsAdds } from '../lib/shopping.ts'

export function shareUrl(id = listId()) {
  return `${window.location.origin}/l/${id}`
}

export function ShareSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const link = shareUrl()
  const [adds, setAdds] = useState(allowsAdds)
  const [qr, setQr] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const message = `Can you grab this? Tick it off as you go. ${link}`

  useEffect(() => {
    if (!open) return
    setNote(null)
    void publishList().catch(() => setNote('You’re offline, so the link will work once this phone is back online.'))
    let cancelled = false
    void import('qrcode').then((QR) => {
      const draw = QR.toDataURL ?? QR.default?.toDataURL
      return draw(link, { margin: 1, width: 280, color: { dark: '#00573F', light: '#FFFDF8' } })
    }).then((url) => {
      if (!cancelled) setQr(url)
    }).catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [open, link])

  async function nativeShare() {
    const data = { title: 'BeepBeep shopping list', text: 'Can you grab this? Tick it off as you go.', url: link }
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(data)
        setNote('Sent from the share sheet.')
        return
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
      }
    }
    await copy()
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setNote('Link copied. Paste it into a message.')
    } catch {
      setNote(link)
    }
  }

  function toggleAdds() {
    const next = !adds
    setAdds(next)
    setAllowsAdds(next)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Share the list" description="Anyone with the link can tick it off. No account, no install.">
      <div className="space-y-3">
        <button type="button" className="press flex h-12 w-full items-center justify-center gap-2 rounded-full bg-leaf text-base font-extrabold text-white shadow-[0_12px_28px_rgba(0,132,61,0.28)]" onClick={() => void nativeShare()}>
          <Icon name="share" size={20} /> Share
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="press h-12 rounded-full bg-gold text-sm font-extrabold text-pine" onClick={() => void copy()}>Copy link</button>
          <a className="press flex h-12 items-center justify-center rounded-full bg-gold text-sm font-extrabold text-pine" href={`sms:?&body=${encodeURIComponent(message)}`}>Text message</a>
          <a className="press flex h-12 items-center justify-center rounded-full bg-white text-sm font-extrabold text-pine shadow-soft ring-1 ring-line" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">WhatsApp</a>
          <button type="button" className="press h-12 rounded-full bg-white text-sm font-extrabold text-pine shadow-soft ring-1 ring-line" onClick={toggleAdds}>
            {adds ? 'Adds are on' : 'Let them add'}
          </button>
        </div>
        <p className="break-all text-center text-xs font-semibold text-muted">{link}</p>
        {note ? <p className="text-center text-sm font-bold text-leaf">{note}</p> : null}
        <div className="rounded-3xl bg-paper p-4 text-center">
          <p className="font-display text-lg font-extrabold text-pine">Or show this QR</p>
          <p className="mt-1 text-sm text-muted">Handy when you’re standing next to each other.</p>
          {qr ? <img src={qr} alt="QR code for this shopping list" className="mx-auto mt-3 h-52 w-52 rounded-2xl bg-white" /> : <div className="mx-auto mt-3 h-52 w-52 animate-pulse rounded-2xl bg-white" />}
        </div>
      </div>
    </Sheet>
  )
}
