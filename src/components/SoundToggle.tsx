import { Volume2, VolumeX } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { setSoundEnabled, soundEnabled, subscribeSound } from '../lib/sound.ts'

export function SoundToggle() {
  const on = useSyncExternalStore(subscribeSound, soundEnabled, () => true)
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? 'Sound on. Turn scanner beep off' : 'Sound off. Turn scanner beep on'}
      onClick={() => setSoundEnabled(!on)}
      className="ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-pine shadow-sm ring-1 ring-line"
    >
      {on ? <Volume2 size={18} /> : <VolumeX size={18} />}
    </button>
  )
}
