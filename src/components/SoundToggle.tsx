import { useSyncExternalStore } from 'react'
import { Icon } from './icons.tsx'
import { setSoundEnabled, soundEnabled, subscribeSound } from '../lib/sound.ts'

export function SoundToggle() {
  const on = useSyncExternalStore(subscribeSound, soundEnabled, () => true)
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? 'Sound on. Turn scanner beep off' : 'Sound off. Turn scanner beep on'}
      onClick={() => setSoundEnabled(!on)}
      className={`press ml-auto flex h-10 w-10 items-center justify-center rounded-full shadow-soft ${on ? 'bg-gold text-pine' : 'bg-white text-muted'}`}
    >
      <Icon name="sound" size={20} />
    </button>
  )
}
