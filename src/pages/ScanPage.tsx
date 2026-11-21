import { Camera, ImagePlus, Keyboard, ScanLine } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '../components/TopBar.tsx'
import { Button } from '../components/ui/button.tsx'
import { Input } from '../components/ui/input.tsx'
import { Sheet } from '../components/ui/dialog.tsx'
import { cameraMessage, decodeImageFile, startLiveScan } from '../lib/scan.ts'

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

  useEffect(() => {
    document.title = 'ShopMate'
    return () => stopRef.current?.()
  }, [])

  function openCode(code: string) {
    const trimmed = code.trim()
    if (!trimmed) return
    navigate(`/product/${encodeURIComponent(trimmed)}`)
  }

  async function beginCamera() {
    setError(null)
    setLive(true)
    await new Promise((resolve) => window.setTimeout(resolve, 40))
    const video = videoRef.current
    if (!video) return
    try {
      const session = await startLiveScan(video, (decoded) => openCode(decoded.text))
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
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const decoded = await decodeImageFile(file)
      openCode(decoded.text)
    } catch {
      setError('No barcode in that photo. Try a closer, well-lit shot, or type the code.')
    } finally {
      setBusy(false)
    }
  }

  async function decodeSample() {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/samples/nutella-ean13.png')
      const blob = await response.blob()
      const decoded = await decodeImageFile(blob)
      openCode(decoded.text)
    } catch {
      setError('The sample photo could not be decoded.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <TopBar />
      <main className="px-4 pb-6">
        {live ? (
          <section className="overflow-hidden rounded-[32px] bg-pine text-white shadow-[0_16px_40px_rgba(14,59,46,0.2)]">
            <div className="relative aspect-[3/4] bg-black">
              <video ref={videoRef} className="h-full w-full object-cover" muted playsInline autoPlay />
              <div className="pointer-events-none absolute inset-6 rounded-[28px] border-2 border-gold/80" />
              <div className="scan-line pointer-events-none absolute right-8 left-8 h-0.5 bg-gold shadow-[0_0_16px_#FFC20E]" />
            </div>
            <div className="flex items-center justify-between gap-3 p-4">
              <p className="font-extrabold">Looking for a barcode</p>
              <Button type="button" variant="secondary" size="sm" onClick={stopCamera}>
                Cancel
              </Button>
            </div>
          </section>
        ) : (
          <section className="pt-2">
            <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-gold-ink">Ready when you are</p>
            <h2 className="mt-2 max-w-[11ch] text-[3.1rem] font-extrabold leading-[0.9] tracking-tight text-pine">
              Scan a barcode.
            </h2>
            <p className="mt-4 max-w-[34ch] text-base font-semibold leading-relaxed text-muted">
              Point your camera at a product. ShopMate reads the code and pulls the open data behind it. Australian foods are well covered by Open Food Facts.
            </p>
            <Button type="button" size="lg" className="mt-6 w-full" onClick={() => void beginCamera()}>
              <ScanLine />
              Start camera
            </Button>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Button type="button" variant="secondary" onClick={() => takeRef.current?.click()}>
                <Camera />
                Take photo
              </Button>
              <Button type="button" variant="secondary" onClick={() => uploadRef.current?.click()}>
                <ImagePlus />
                Upload
              </Button>
            </div>
            <button type="button" onClick={() => setManual(true)} className="mt-4 flex w-full items-center justify-center gap-2 py-2 text-sm font-extrabold text-pine">
              <Keyboard size={18} />
              Type a code
            </button>
          </section>
        )}

        {busy ? <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-pine">Reading the barcode…</p> : null}
        {error ? <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-sale">{error}</p> : null}

        <button type="button" onClick={() => void decodeSample()} className="mt-8 text-left text-sm font-bold text-gold-ink underline">
          No packet handy? Decode the Nutella sample photo.
        </button>
        <p className="mt-6 text-xs font-semibold leading-relaxed text-muted">
          Reads EAN-13, EAN-8, UPC-A, UPC-E, Code 128 and QR. Live scan uses the Barcode Detector when your browser has it, and ZXing everywhere else.
        </p>
      </main>

      <input ref={takeRef} className="sr-only" type="file" accept="image/*" capture="environment" onChange={(event) => void onFile(event.target.files?.[0])} />
      <input ref={uploadRef} className="sr-only" type="file" accept="image/*" onChange={(event) => void onFile(event.target.files?.[0])} />

      <Sheet open={manual} onOpenChange={setManual} title="Type a barcode" description="The digits under the bars, or the text in a QR code.">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            openCode(typed)
          }}
        >
          <Input
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            inputMode="text"
            autoComplete="off"
            autoFocus
            placeholder="e.g. 3017620422003"
            aria-label="Barcode"
          />
          <Button type="submit" size="lg" className="w-full">
            Look it up
          </Button>
          <button type="button" className="w-full py-2 text-sm font-extrabold text-muted" onClick={() => openCode('3017620422003')}>
            Try Nutella, 3017620422003
          </button>
        </form>
      </Sheet>
    </div>
  )
}
