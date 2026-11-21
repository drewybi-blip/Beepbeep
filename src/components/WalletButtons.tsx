import { useEffect, useState } from 'react'
import { listId } from '../lib/shopping.ts'

type Status = { apple: boolean; google: boolean }

export function WalletButtons() {
  const [status, setStatus] = useState<Status | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/wallet/status')
      .then((response) => response.json())
      .then((body: Status) => {
        if (!cancelled) setStatus(body)
      })
      .catch(() => {
        if (!cancelled) setStatus({ apple: false, google: false })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const id = listId()

  return (
    <div className="space-y-2">
      <p className="text-sm font-black text-pine">Send the list to a wallet</p>
      <p className="text-xs font-semibold leading-relaxed text-muted">
        Wallet passes can’t be ticked inside the wallet. The pass carries a summary and a link that opens in-store mode.
      </p>
      {status?.apple ? (
        <a className="flex h-12 items-center justify-center rounded-full bg-pine text-sm font-black text-gold" href={`/api/wallet/apple/${id}`}>
          Add to Apple Wallet
        </a>
      ) : (
        <button type="button" disabled className="flex h-12 w-full items-center justify-center rounded-full bg-paper text-sm font-black text-muted ring-1 ring-line">
          Add to Apple Wallet · coming soon
        </button>
      )}
      {status?.google ? (
        <GoogleSave id={id} />
      ) : (
        <button type="button" disabled className="flex h-12 w-full items-center justify-center rounded-full bg-paper text-sm font-black text-muted ring-1 ring-line">
          Save to Google Wallet · coming soon
        </button>
      )}
    </div>
  )
}

function GoogleSave({ id }: { id: string }) {
  return (
    <button
      type="button"
      className="flex h-12 w-full items-center justify-center rounded-full bg-pine text-sm font-black text-gold"
      onClick={() => {
        void fetch(`/api/wallet/google/${id}`)
          .then((response) => response.json())
          .then((body: { url?: string }) => {
            if (body.url) window.location.href = body.url
          })
      }}
    >
      Save to Google Wallet
    </button>
  )
}
