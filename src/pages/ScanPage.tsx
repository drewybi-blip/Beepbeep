import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { InstallHint } from '../components/InstallHint.tsx'
import { TopBar } from '../components/TopBar.tsx'
import { Button } from '../components/ui/button.tsx'
import { Input } from '../components/ui/input.tsx'
import { Sheet } from '../components/ui/dialog.tsx'
import { Icon, PANTRY, type IconName } from '../components/icons.tsx'
import { aud, STORE_LABELS } from '../lib/format.ts'
import { FOOD, HERO_FOOD, foodSrc, foodSrcSet, type FoodShot } from '../lib/food.ts'
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

  return (
    <div>
      <TopBar />
      {live ? (
        <section className="px-4">
          <div className="overflow-hidden rounded-3xl bg-pine text-white shadow-soft">
            <div className="relative aspect-[3/4] bg-black">
              <video ref={videoRef} className="h-full w-full object-cover" muted playsInline autoPlay />
              <div className="pointer-events-none absolute inset-6 rounded-3xl border-2 border-gold/80" />
              <div className="scan-line pointer-events-none absolute right-8 left-8 h-0.5 bg-gold shadow-[0_0_16px_#FFCD00]" />
              {pop ? (
                <p className="pop-in absolute bottom-6 left-1/2 rounded-full bg-gold px-4 py-2 text-base font-bold text-pine" role="status">
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
          <section className="relative overflow-hidden px-4 pt-2 pb-2">
            <div className="pointer-events-none absolute -top-16 right-[-48px] h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(255,205,0,0.55),transparent_68%)]" />
            <div className="pointer-events-none absolute top-36 -left-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(0,132,61,0.14),transparent_70%)]" />
            <div className="relative">
              <p className="tag-strip bg-white text-leaf shadow-soft">Sunny shop day</p>
              <h1 className="font-display mt-4 text-[40px] leading-[0.95] font-extrabold tracking-tight text-pine">
                Scan it.<br />Save it.<br />Beep beep!
              </h1>
              <p className="mt-4 max-w-[28ch] text-base text-pine/80">
                Point at a packet. We’ll beep, then grab what’s in it and what it’s going for today.
              </p>
              <Button type="button" size="lg" className="press glow mt-6 w-full" onClick={() => void beginCamera()}>
                <Icon name="scan" size={22} />
                Start the camera
              </Button>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {HERO_FOOD.map((id, index) => (
                  <FoodPhoto key={id} shot={FOOD.find((item) => item.id === id) as FoodShot} eager className="float-food h-28 w-full rounded-3xl object-cover shadow-soft" sizes="30vw" style={{ animationDelay: `${index * 0.6}s` }} />
                ))}
              </div>
            </div>
          </section>
          <main className="space-y-10 px-4 pt-6 pb-28">
            <section>
              <div className="mb-4">
                <h2 className="font-display text-2xl font-extrabold">Fresh off the bench</h2>
                <p className="mt-1 text-sm text-muted">Studio snacks. No logos, just the good stuff.</p>
              </div>
              <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2">
                {FOOD.map((shot) => (
                  <figure key={shot.id} className="w-40 shrink-0">
                    <FoodPhoto shot={shot} className="h-40 w-full rounded-3xl object-cover shadow-soft" sizes="160px" />
                    <figcaption className="mt-2 text-sm font-extrabold text-pine">{shot.caption}</figcaption>
                  </figure>
                ))}
              </div>
            </section>
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
              <PantryPill active={pantry === 'all'} label="All" icon="star" onClick={() => setPantry('all')} />
              {PANTRY.map((item) => (
                <PantryPill key={item.id} active={pantry === item.id} label={item.label} icon={item.icon} onClick={() => setPantry(item.id)} />
              ))}
            </div>
            <section>
              <div className="mb-4 flex items-end justify-between">
                <h2 className="font-display text-2xl font-extrabold">From your beeps</h2>
                <Link to="/researched" className="text-sm font-extrabold text-leaf">Researched</Link>
              </div>
              {specials === null ? (
                <div className="flex gap-4">
                  <div className="h-40 w-40 animate-pulse rounded-3xl bg-white" />
                  <div className="h-40 w-40 animate-pulse rounded-3xl bg-white" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-3xl bg-white px-6 py-8 text-center shadow-soft">
                  <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-gold text-pine"><Icon name="tag" size={32} /></span>
                  <p className="font-display mt-4 text-xl font-extrabold">Nothing in this aisle yet</p>
                  <p className="mt-2 text-sm text-muted">Your scans live in Researched. Have a beep and real price drops will turn up here. We don’t invent them.</p>
                </div>
              ) : (
                <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2">
                  {filtered.map((item) => (
                    <Link key={item.barcode} to={`/product/${item.barcode}`} className="w-44 shrink-0 overflow-hidden rounded-3xl bg-white shadow-soft">
                      <div className="mx-3 mt-3 h-28 overflow-hidden rounded-2xl bg-gold-soft">
                        {item.image ? <img src={item.image} alt="" className="h-full w-full object-contain" loading="lazy" referrerPolicy="no-referrer" /> : null}
                      </div>
                      <div className="p-3">
                        <span className="tag-strip bg-leaf text-white">{item.savings ? 'Price drop' : 'On special'}</span>
                        <p className="mt-2 line-clamp-2 font-display text-base leading-tight font-extrabold">{item.name}</p>
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
            {error ? <p className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-pine">{error}</p> : null}
          </main>
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

function FoodPhoto({ shot, eager = false, className, sizes, style }: { shot: FoodShot; eager?: boolean; className?: string; sizes: string; style?: CSSProperties }) {
  return (
    <img
      src={foodSrc(shot.id, 480)}
      srcSet={foodSrcSet(shot.id)}
      sizes={sizes}
      alt={shot.alt}
      width={shot.width}
      height={shot.height}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      {...(eager ? { fetchPriority: 'high' as const } : {})}
      className={className}
      style={style}
    />
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
