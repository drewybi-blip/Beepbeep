import { useEffect } from 'react'
import { NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Icon, type IconName } from './components/icons.tsx'
import { unlockAudio } from './lib/sound.ts'
import { ProductPage } from './pages/ProductPage.tsx'
import { ResearchedPage } from './pages/ResearchedPage.tsx'
import { InStorePage } from './pages/InStorePage.tsx'
import { ScanPage } from './pages/ScanPage.tsx'
import { ShoppingPage } from './pages/ShoppingPage.tsx'
import { WelcomePage } from './pages/WelcomePage.tsx'
import { cn } from './lib/utils.ts'

function Shell() {
  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock)
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])
  const inStore = useLocation().pathname.startsWith('/store')
  const tabs: { to: string; label: string; icon: IconName; end: boolean }[] = [
    { to: '/', label: 'Home', icon: 'scan', end: true },
    { to: '/researched', label: 'Researched', icon: 'star', end: false },
    { to: '/list', label: 'List', icon: 'basket', end: false },
  ]
  return (
    <div className="mx-auto min-h-dvh max-w-[480px] bg-paper text-ink">
      <div className={inStore ? '' : 'pb-[calc(5.4rem+env(safe-area-inset-bottom))]'}>
        <Outlet />
      </div>
      {inStore ? null : (
        <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(8px+env(safe-area-inset-bottom))]" aria-label="Primary">
          <div className="glass mx-auto grid max-w-[480px] grid-cols-3 rounded-full p-1">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  cn(
                    'press flex flex-col items-center gap-1 rounded-full px-2 py-2 text-[11px] font-semibold',
                    isActive ? 'bg-gold text-pine' : 'text-muted',
                  )
                }
              >
                <Icon name={tab.icon} size={22} />
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
        <Route path="welcome" element={<WelcomePage />} />
        <Route path="product/:code" element={<ProductPage />} />
        <Route path="researched" element={<ResearchedPage />} />
        <Route path="list" element={<ShoppingPage />} />
        <Route path="store" element={<InStorePage />} />
        <Route path="store/:listId" element={<InStorePage />} />
      </Route>
    </Routes>
  )
}
