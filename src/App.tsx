import { BookOpen, ScanLine, ShoppingBag } from 'lucide-react'
import { useEffect } from 'react'
import { NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { unlockAudio } from './lib/sound.ts'
import { ProductPage } from './pages/ProductPage.tsx'
import { ResearchedPage } from './pages/ResearchedPage.tsx'
import { InStorePage } from './pages/InStorePage.tsx'
import { ScanPage } from './pages/ScanPage.tsx'
import { ShoppingPage } from './pages/ShoppingPage.tsx'
import { cn } from './lib/utils.ts'

function Shell() {
  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock)
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])
  const inStore = useLocation().pathname.startsWith('/store')
  const tabs = [
    { to: '/', label: 'Scan', icon: ScanLine, end: true },
    { to: '/researched', label: 'Researched', icon: BookOpen, end: false },
    { to: '/list', label: 'Shopping List', icon: ShoppingBag, end: false },
  ]
  return (
    <div className="mx-auto min-h-dvh max-w-[480px] bg-paper text-ink">
      <div className={inStore ? '' : 'pb-[calc(5.4rem+env(safe-area-inset-bottom))]'}>
        <Outlet />
      </div>
      {inStore ? null : (
        <nav className="fixed inset-x-0 bottom-0 z-40" aria-label="Primary">
          <div className="mx-auto grid max-w-[480px] grid-cols-3 gap-1 border-t border-line bg-white/95 px-2 pt-2 pb-[calc(0.45rem+env(safe-area-inset-bottom))] backdrop-blur">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-0.5 rounded-full px-2 py-2 text-[11px] font-extrabold',
                    isActive ? 'bg-gold text-pine shadow-[3px_3px_0_#0e3b2e]' : 'text-muted',
                  )
                }
              >
                <tab.icon size={20} />
                {tab.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<ScanPage />} />
        <Route path="product/:code" element={<ProductPage />} />
        <Route path="researched" element={<ResearchedPage />} />
        <Route path="list" element={<ShoppingPage />} />
        <Route path="store" element={<InStorePage />} />
        <Route path="store/:listId" element={<InStorePage />} />
      </Route>
    </Routes>
  )
}
