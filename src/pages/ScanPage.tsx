import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { InstallHint } from '../components/InstallHint.tsx'
import { TopBar } from '../components/TopBar.tsx'
import { Button } from '../components/ui/button.tsx'
import { Input } from '../components/ui/input.tsx'
import { Sheet } from '../components/ui/dialog.tsx'
import { Icon, PANTRY, type IconName } from '../components/icons.tsx'
import { aud, STORE_LABELS } from '../lib/format.ts'
import { cameraMessage, decodeImageFile, startLiveScan } from '../lib/scan.ts'
import { playScanBeep, unlockAudio } from '../lib/sound.ts'

type Special = {
  barcode: string
  name: string
  image: string | null
  brand: string | null
  price: number
  wasPrice: number | null
  unitPrice: string | null
  store: string
  specialLabel: string
  savings: number | null
}

export function ScanPage() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const takeRef = useRef<HTMLInputElement>(null)
  const uploadRef = useRef<HTMLInputElement>(null)
  const stopRef = useRef<(() => void) | null>(null)
  const [live, setLive] = useState(false)
  const [manual, setManual] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pop, setPop] = useState(false)
  const [specials, setSpecials] = useState<Special[] | null>(null)
  const [pantry, setPantry] = useState<string>('all')

  useEffect(() => {
    document.title = 'BeepBeep'
    return () => stopRef.current?.()
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch('/api/specials')
      .then((response) => response.json())
      .then((body: { specials?: Special[] }) => {
        if (!cancelled) setSpecials(body.specials || [])
      })
      .catch(() => {
        if (!cancelled) setSpecials([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  function openCode(code: string, scanned = false) {
    const trimmed = code.trim()
    if (!trimmed) return
    const go = () => navigate(`/product/${encodeURIComponent(trimmed)}`)
    if (!scanned) {
      go()
      return
    }
    playScanBeep()
    setPop(true)
    window.setTimeout(go, 480)
  }

  async function beginCamera() {
    unlockAudio()
    setError(null)
    setLive(true)
    await new Promise((resolve) => window.setTimeout(resolve, 40))
    const video = videoRef.current
    if (!video) return
    try {
      const session = await startLiveScan(video, (decoded) => openCode(decoded.text, true))
      stopRef.current = session.stop
    } catch (caught) {
      setLive(false)
      setError(cameraMessage(caught))
    }
  }

  function stopCamera() {
    stopRef.current?.()
    stopRef.current = null
    setLive(false)
  }

  async function onFile(file: File | undefined) {
    unlockAudio()
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const decoded = await decodeImageFile(file)
      openCode(decoded.text, true)
    } catch {
      setError('No barcode in that photo. Try a closer, well-lit shot, or type the code.')
    } finally {
      setBusy(false)
    }
  }

  async function decodeSample() {
    unlockAudio()
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/samples/nutella-ean13.png')
      const blob = await response.blob()
      const decoded = await decodeImageFile(blob)
      openCode(decoded.text, true)
    } catch {
      setError('The sample photo could not be decoded.')
    } finally {
      setBusy(false)
    }
  }

  const filtered = (specials || []).filter((item) => pantry === 'all' || matchesPantry(item.name, pantry))
  const lead = specials?.[0]

  return (
    <div>
      <TopBar />
      {live ? (
        <section className="px-4">
          <div className="overflow-hidden rounded-3xl bg-pine text-white shadow-soft">
            <div className="relative aspect-[3/4] bg-black">
              <video ref={videoRef} className="h-full w-full object-cover" muted playsInline autoPlay />
              <div className="pointer-events-none absolute inset-6 rounded-3xl border-2 border-gold/80" />
              <div className="scan-line pointer-events-none absolute right-8 left-8 h-0.5 bg-gold shadow-[0_0_16px_#FFC20E]" />
              {pop ? (
                <p className="pop-in absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-lime px-4 py-2 text-base font-bold text-pine" role="status">
                  Beep. Got it.
                </p>
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-3 p-4">
              <p className="font-display text-lg font-bold">Looking for the bars</p>
              <Button type="button" variant="secondary" size="sm" onClick={stopCamera}>Cancel</Button>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="bg-gold px-4 pt-6 pb-10">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="tag-strip bg-white text-pine">Fresh this week</p>
                <h1 className="font-display mt-4 text-[40px] leading-[0.95] font-extrabold tracking-tight text-pine">
                  Scan it.<br />Save it.<br />Beep beep!
                </h1>
                <p className="mt-4 max-w-[28ch] text-base text-pine/80">
                  Point at a packet. We beep, then pull the open data and today’s shelf price.
                </p>
              </div>
              <span className="mascot mt-6 grid h-16 w-16 shrink-0 place-items-center rounded-3xl bg-white text-pine shadow-soft">
                <Icon name="scan" size={36} />
              </span>
            </div>
              <Button type="button" size="lg" variant="pine" className="press mt-6 w-full" onClick={() => void beginCamera()}>
              <Icon name="scan" size={22} />
              Start camera
            </Button>
            {specials?.some((item) => item.image) ? (
              <div className="mt-8 flex items-end justify-center">
                {specials.slice(0, 3).map((item, index) => (
                  <Link
                    key={item.barcode}
                    to={`/product/${item.barcode}`}
                    className="blob-mask -ml-6 h-28 w-24 bg-white shadow-soft first:ml-0"
                    style={{ transform: `rotate(${index === 1 ? 0 : index === 0 ? -8 : 8}deg)` }}
                  >
                    {item.image ? <img src={item.image} alt="" className="h-full w-full object-contain p-2" referrerPolicy="no-referrer" /> : <span className="grid h-full place-items-center text-pine"><Icon name="basket" /></span>}
                  </Link>
                ))}
              </div>
            ) : null}
          </section>
          <svg viewBox="0 0 390 32" className="block h-8 w-full bg-gold text-paper" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 16Q98 32 195 16T390 16V32H0Z" fill="currentColor" />
          </svg>
          <main className="space-y-8 px-4 pt-2 pb-36">
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
              <PantryPill active={pantry === 'all'} label="All" icon="star" onClick={() => setPantry('all')} />
              {PANTRY.map((item) => (
                <PantryPill key={item.id} active={pantry === item.id} label={item.label} icon={item.icon} onClick={() => setPantry(item.id)} />
              ))}
            </div>
            <section>
              <div className="mb-4 flex items-end justify-between">
                <h2 className="font-display text-2xl font-bold">Today’s specials</h2>
                <Link to="/researched" className="text-sm font-semibold text-leaf">See all</Link>
              </div>
              {specials === null ? (
                <div className="flex gap-4">
                  <div className="h-56 w-44 animate-pulse rounded-3xl bg-white" />
                  <div className="h-56 w-44 animate-pulse rounded-3xl bg-white" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-3xl bg-white px-6 py-8 text-center shadow-soft">
                  <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-gold text-pine"><Icon name="tag" size={32} /></span>
                  <p className="font-display mt-4 text-xl font-bold">No specials in this aisle yet</p>
                  <p className="mt-2 text-sm text-muted">Scan a few packets. Real price drops land here. We don’t invent them.</p>
                </div>
              ) : (
                <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2">
                  {filtered.map((item) => (
                    <Link key={item.barcode} to={`/product/${item.barcode}`} className="w-44 shrink-0 overflow-hidden rounded-3xl bg-white shadow-soft">
                      <div className="blob-mask mx-3 mt-3 h-28 bg-gold-soft">
                        {item.image ? <img src={item.image} alt="" className="h-full w-full object-contain" referrerPolicy="no-referrer" /> : null}
                      </div>
                      <div className="p-3">
                        <span className="tag-strip bg-pop text-white">{item.savings ? 'Price drop' : 'On special'}</span>
                        <p className="mt-2 line-clamp-2 font-display text-base leading-tight font-bold">{item.name}</p>
                        <p className="mt-2 font-display text-lg font-extrabold">{aud(item.price)}</p>
                        <p className="text-xs text-muted">{STORE_LABELS[item.store] || item.store}{item.unitPrice ? ` · ${item.unitPrice}` : ''}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="secondary" className="press" onClick={() => takeRef.current?.click()}>
                <Icon name="scan" size={18} /> Take photo
              </Button>
              <Button type="button" variant="secondary" className="press" onClick={() => uploadRef.current?.click()}>
                <Icon name="list" size={18} /> Upload
              </Button>
            </div>
            <button type="button" onClick={() => setManual(true)} className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-pine">
              <Icon name="tag" size={18} /> Type a code
            </button>
            <InstallHint />
            <button type="button" onClick={() => void decodeSample()} className="text-left text-sm font-semibold text-gold-ink underline">
              No packet handy? Decode the Nutella sample photo.
            </button>
            <Link to="/welcome" className="block text-sm font-semibold text-leaf">Why BeepBeep</Link>
            {busy ? <p className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold">Reading the barcode…</p> : null}
            {error ? <p className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-sale">{error}</p> : null}
          </main>
          {lead ? (
            <div className="fixed inset-x-0 z-30 mx-auto max-w-[480px] px-4 bottom-[calc(5rem+env(safe-area-inset-bottom))]">
              <Link to={`/product/${lead.barcode}`} className="flex h-12 items-center justify-between rounded-full bg-pine px-4 text-sm font-semibold text-gold shadow-soft">
                <span className="truncate">{lead.name} · {aud(lead.price)} at {STORE_LABELS[lead.store] || lead.store}</span>
                <span className="shrink-0">See offer</span>
              </Link>
            </div>
          ) : null}
        </>
      )}
      <input ref={takeRef} className="sr-only" type="file" accept="image/*" capture="environment" onChange={(event) => void onFile(event.target.files?.[0])} />
      <input ref={uploadRef} className="sr-only" type="file" accept="image/*" onChange={(event) => void onFile(event.target.files?.[0])} />
      <Sheet open={manual} onOpenChange={setManual} title="Type a barcode" description="The digits under the bars, or the text in a QR code.">
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); openCode(typed) }}>
          <Input value={typed} onChange={(event) => setTyped(event.target.value)} inputMode="text" autoComplete="off" autoFocus placeholder="e.g. 3017620422003" aria-label="Barcode" />
          <Button type="submit" size="lg" className="w-full">Look it up</Button>
          <button type="button" className="w-full py-2 text-sm font-semibold text-muted" onClick={() => openCode('3017620422003')}>Try Nutella, 3017620422003</button>
        </form>
      </Sheet>
    </div>
  )
}

function PantryPill({ active, label, icon, onClick }: { active: boolean; label: string; icon: IconName; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`press flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold ${active ? 'bg-pine text-gold' : 'bg-white text-pine shadow-soft'}`}>
      <Icon name={icon} size={18} />
      {label}
    </button>
  )
}

function matchesPantry(name: string, pantry: string) {
  const text = name.toLowerCase()
  const words: Record<string, string[]> = {
    fruit: ['fruit', 'apple', 'veg', 'salad'],
    dairy: ['milk', 'cheese', 'yoghurt', 'butter'],
    meat: ['beef', 'chicken', 'meat', 'ham'],
    bakery: ['bread', 'bakery', 'roll'],
    drinks: ['drink', 'juice', 'cola', 'water'],
    chemist: ['vitamin', 'tablet', 'panadol'],
    household: ['clean', 'spray', 'wash'],
    pet: ['dog', 'cat', 'pet'],
    baby: ['baby', 'nappy', 'formula'],
    booze: ['wine', 'beer', 'spirit'],
  }
  return (words[pantry] || []).some((word) => text.includes(word))
}
