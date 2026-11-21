/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface DetectedBarcode {
  rawValue: string
  format: string
}

interface BarcodeDetectorOptions {
  formats?: string[]
}

declare class BarcodeDetector {
  constructor(options?: BarcodeDetectorOptions)
  static getSupportedFormats?: () => Promise<string[]>
  detect: (source: ImageBitmapSource) => Promise<DetectedBarcode[]>
}

interface Window {
  BarcodeDetector?: typeof BarcodeDetector
}
