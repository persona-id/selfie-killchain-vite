import { useEffect, useLayoutEffect } from 'react'
import { Outlet, useLocation } from 'react-router'

import { AppCursorProvider } from './AppCursor'
import { ImageModal } from './ImageModal'
import { GalleryProvider } from '../context/GalleryContext'
import { GlobeIntroProvider } from '../context/GlobeIntroContext'
import { KillchainChromeProvider } from '../context/KillchainChromeContext'
import '../styles/themes.css'
import '../styles/glass.css'
import '../styles/killchain.css'

export default function AppShell() {
  const location = useLocation()
  const isGlobe = location.pathname === '/'
  const isMatrix = location.pathname === '/matrix'
  const isDeconstruct = location.pathname === '/deconstruct'

  useEffect(() => {
    document.documentElement.removeAttribute('data-menu-theme')
    try {
      sessionStorage.removeItem('persona-fas-menu-theme')
    } catch {
      /* ignore */
    }
  }, [])

  useLayoutEffect(() => {
    const root = document.documentElement
    if (isGlobe) {
      root.classList.remove('killchain-scroll')
      document.body.classList.remove('killchain-scroll')
    } else {
      root.classList.add('killchain-scroll')
      document.body.classList.add('killchain-scroll')
    }

    return () => {
      root.classList.remove('killchain-scroll')
      document.body.classList.remove('killchain-scroll')
    }
  }, [isGlobe])

  return (
    <GalleryProvider>
      <KillchainChromeProvider>
        <GlobeIntroProvider>
          <AppCursorProvider>
          <div className="killchain-page-bg" aria-hidden />
          <div
            className={
              isGlobe
                ? 'killchain-app killchain-app--globe'
                : `killchain-app${isMatrix ? ' killchain-app--matrix' : ''}${isDeconstruct ? ' killchain-app--deconstruct' : ''}`
            }
          >
            <Outlet />
          </div>
          <ImageModal />
        </AppCursorProvider>
        </GlobeIntroProvider>
      </KillchainChromeProvider>
    </GalleryProvider>
  )
}
