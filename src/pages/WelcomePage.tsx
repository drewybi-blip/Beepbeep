import { Link } from 'react-router-dom'
import { Icon } from '../components/icons.tsx'

export function WelcomePage() {
  return (
    <div className="bg-paper pb-8">
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,205,0,0.55),transparent_58%)] px-4 pt-8 pb-12">
        <p className="text-center text-sm font-extrabold tracking-[0.2em] text-leaf">BEEPBEEP</p>
        <h1 className="font-display mx-auto mt-6 text-center text-[40px] leading-[0.95] font-extrabold">
          <span className="block text-pine">Scan, save, shop</span>
          <span className="mt-2 block text-gold">Beep beep</span>
        </h1>
        <p className="mx-auto mt-4 max-w-[30ch] text-center text-base text-pine/80">
          Line up a barcode. We’ll beep, then show what’s in it and what it’s selling for today.
        </p>
        <Link to="/" className="press glow mx-auto mt-8 flex h-12 w-fit items-center gap-2 rounded-full bg-gold px-6 font-extrabold text-pine">
          <Icon name="scan" size={20} /> Scan barcode
        </Link>
      </section>
      <section className="space-y-8 px-4 pt-8">
        <h2 className="font-display text-center text-2xl font-bold">How it works</h2>
        <div className="grid gap-6">
          {[
            ['scan', 'Scan', 'Line up the barcode. We beep the moment it’s read.'],
            ['tag', 'Know', 'Ingredients, nutrition and the open catalogue it came from.'],
            ['basket', 'Save', 'Keep a list, then tick it off in the aisle.'],
          ].map(([icon, title, copy]) => (
            <div key={title} className="flex items-start gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl bg-gold text-pine">
                <Icon name={icon as 'scan'} size={32} />
              </span>
              <div className="pt-1">
                <h3 className="font-display text-xl font-bold">{title}</h3>
                <p className="mt-1 text-sm text-muted">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="mx-4 mt-16 rounded-3xl bg-white p-6 shadow-soft">
        <p className="tag-strip bg-gold text-pine">Go Pro</p>
        <h2 className="font-display mt-4 text-[32px] leading-none font-extrabold">$5 a month</h2>
        <p className="mt-3 text-sm text-muted">Price-drop alerts, a longer researched shelf, and a monthly giveaway drawn from Pro members. Checkout isn’t open yet.</p>
        <p className="mt-6 text-sm font-semibold text-pine">We’ll say when you can join.</p>
      </section>
      <section className="mx-4 mt-8 rounded-3xl bg-pine p-6 text-gold">
        <p className="tag-strip bg-gold text-pine">Clubs</p>
        <h2 className="font-display mt-4 text-[32px] leading-none font-extrabold text-white">Raise money for your club</h2>
        <p className="mt-3 text-sm text-white/80">Every 12-month subscription sends $10 to the club named at sign-up. Same plan, a little back to the sausage sizzle.</p>
      </section>
    </div>
  )
}
