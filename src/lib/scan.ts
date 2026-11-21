import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType, NotFoundException } from '@zxing/library'

const FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.QR_CODE,
]

const DETECTOR_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code']

export type DecodedCode = { text: string; format: string }

function reader() {
  const hints = new Map()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATS)
  hints.set(DecodeHintType.TRY_HARDER, true)
  return new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 180 })
}

function formatName(format: unknown) {
  const name = BarcodeFormat[format as number]
  return typeof name === 'string' ? name.replaceAll('_', ' ') : 'Barcode'
}

async function detectNative(source: ImageBitmapSource) {
  if (!window.BarcodeDetector) return null
  try {
    const detector = new window.BarcodeDetector({ formats: DETECTOR_FORMATS })
    const codes = await detector.detect(source)
    const found = codes.find((code) => code.rawValue)
    return found ? { text: found.rawValue, format: found.format.replaceAll('_', ' ') } : null
  } catch {
    return null
  }
}

export async function decodeImageFile(file: Blob): Promise<DecodedCode> {
  const bitmap = await createImageBitmap(file)
  const native = await detectNative(bitmap)
  bitmap.close()
  if (native) return native

  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const result = await reader().decodeFromImageElement(image)
    return { text: result.getText(), format: formatName(result.getBarcodeFormat()) }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function startLiveScan(video: HTMLVideoElement, onCode: (code: DecodedCode) => void) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
  })
  video.srcObject = stream
  video.muted = true
  video.playsInline = true
  await video.play()

  let stopped = false
  const stop = () => {
    if (stopped) return
    stopped = true
    stream.getTracks().forEach((track) => track.stop())
    video.srcObject = null
  }

  if (window.BarcodeDetector) {
    const tick = async () => {
      if (stopped) return
      if (video.readyState >= 2) {
        const found = await detectNative(video)
        if (found) {
          stop()
          onCode(found)
          return
        }
      }
      if (!stopped) window.setTimeout(tick, 180)
    }
    void tick()
    return { stop }
  }

  const controls = await reader().decodeFromStream(stream, video, (result, error) => {
    if (stopped || !result) {
      if (error && !(error instanceof NotFoundException)) return
      return
    }
    stopped = true
    controls.stop()
    onCode({ text: result.getText(), format: formatName(result.getBarcodeFormat()) })
  })
  return {
    stop: () => {
      stopped = true
      controls.stop()
      stop()
    },
  }
}

export function cameraMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Camera access is off. Allow it in the browser settings, or take a photo instead.'
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No usable camera was found. Take a photo or type the code.'
  }
  if (name === 'NotReadableError') {
    return 'The camera is busy in another app. Close it, or upload a photo.'
  }
  return 'The camera did not start. You can still take a photo or type the code.'
}
