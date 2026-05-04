'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useTheme } from 'next-themes'
import { Container } from '@/components/ui/container'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { cn } from '@/lib/utils'
import { EDITORIAL_SECTION } from '@/lib/constants'
import { X } from 'lucide-react'

// Minimal navigation for premium boutique feel
const navigation = [
  { name: 'Veículos', href: '/veiculos' },
  { name: 'Importação', href: '/importacao-de-veiculos-de-luxo' },
  { name: 'Jornada Attra', href: '/jornada' },
  { name: 'Serviços', href: '/servicos' },
  { name: 'Notícias', href: '/news' },
  { name: EDITORIAL_SECTION.menuLabel, href: EDITORIAL_SECTION.route },
  { name: 'Contato', href: '/contato' },
]

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('')
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme } = useTheme()

  // Refs for focus management
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const menuPanelRef = useRef<HTMLDivElement>(null)
  const firstLinkRef = useRef<HTMLAnchorElement>(null)
  const lastLinkRef = useRef<HTMLAnchorElement>(null)
  const scrollPositionRef = useRef(0)

  // Close menu function with focus restoration
  const closeMenu = useCallback(() => {
    setMobileMenuOpen(false)
    // Return focus to the menu button after closing
    setTimeout(() => {
      menuButtonRef.current?.focus()
    }, 100)
  }, [])

  // Toggle menu function
  const toggleMenu = useCallback(() => {
    setMobileMenuOpen(prev => !prev)
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  // Lock body scroll when mobile menu is open - improved version
  useEffect(() => {
    if (mobileMenuOpen) {
      // Store current scroll position
      scrollPositionRef.current = window.scrollY
      // Apply styles to prevent scroll
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollPositionRef.current}px`
      document.body.style.left = '0'
      document.body.style.right = '0'
      document.body.style.width = '100%'

      // Move focus to first menu item
      setTimeout(() => {
        firstLinkRef.current?.focus()
      }, 300)
    } else {
      // Restore body styles
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.left = ''
      document.body.style.right = ''
      document.body.style.width = ''
      // Restore scroll position
      if (scrollPositionRef.current > 0) {
        window.scrollTo(0, scrollPositionRef.current)
      }
    }

    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.left = ''
      document.body.style.right = ''
      document.body.style.width = ''
    }
  }, [mobileMenuOpen])

  // Handle ESC key to close menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        e.preventDefault()
        closeMenu()
      }
    }

    if (mobileMenuOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [mobileMenuOpen, closeMenu])

  // Focus trap within the menu
  useEffect(() => {
    const handleTabKey = (e: KeyboardEvent) => {
      if (!mobileMenuOpen || e.key !== 'Tab') return

      const focusableElements = menuPanelRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      )

      if (!focusableElements || focusableElements.length === 0) return

      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }
    }

    if (mobileMenuOpen) {
      document.addEventListener('keydown', handleTabKey)
    }

    return () => {
      document.removeEventListener('keydown', handleTabKey)
    }
  }, [mobileMenuOpen])

  useEffect(() => {
    const handleScroll = () => {
      if (!mobileMenuOpen) {
        setIsScrolled(window.scrollY > 50)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [mobileMenuOpen])

  // Determine which logo to show based on theme
  // Always show white logo since header now has dark background
  const showWhiteLogo = true

  // Check if it's light mode for scrolled state styling
  const isLightMode = mounted && resolvedTheme === 'light'

  return (
    <>
      <header
        className={cn(
          'site-header',
          isScrolled
            ? isLightMode
              ? 'site-header--scrolled-light'
              : 'site-header--scrolled-dark'
            : 'site-header--overlay'
        )}
      >
        <Container>
          <nav className="flex items-center justify-between h-20 py-4">
            {/* Logo - always white when not scrolled (dark header), theme-aware when scrolled */}
            <Link href="/" className="site-header__logo group">
              {/* White logo - visible when not scrolled OR scrolled in dark mode */}
              <Image
                src="/images/logo-white.png"
                alt="Attra Veículos"
                width={140}
                height={40}
                className={cn(
                  'h-10 w-auto object-contain transition-opacity duration-300',
                  (!isScrolled || !isLightMode) ? 'opacity-100' : 'opacity-0'
                )}
                priority
                unoptimized
              />
              {/* Black logo - only visible when scrolled AND in light theme */}
              <Image
                src="/images/logo-black.png"
                alt="Attra Veículos"
                width={140}
                height={40}
                className={cn(
                  'absolute left-0 h-10 w-auto object-contain transition-opacity duration-300',
                  isScrolled && isLightMode ? 'opacity-100' : 'opacity-0'
                )}
                priority
                unoptimized
              />
            </Link>

            {/* Desktop navigation - improved typography weight and contrast */}
            <div className="hidden lg:flex items-center gap-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'site-header__nav-link',
                    isScrolled && isLightMode
                      ? 'site-header__nav-link--dark'
                      : 'site-header__nav-link--light',
                    activeSection === item.href && 'active'
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Actions - theme toggle with improved visibility */}
            <div className="hidden lg:flex items-center gap-4">
              <ThemeToggle
                className={cn(
                  'transition-all duration-300',
                  isScrolled
                    ? isLightMode
                      ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                )}
              />
            </div>

            {/* Mobile menu button - enhanced visibility and touch target */}
            <div className="flex lg:hidden items-center gap-2">
              {/* Always-visible "Estoque" pill — zero-scroll access to inventory */}
              <Link
                href="/veiculos"
                className={cn(
                  'inline-flex items-center h-11 px-3 sm:px-4 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  isScrolled && isLightMode
                    ? 'bg-gray-900 hover:bg-gray-800 text-white border border-gray-900'
                    : 'bg-white text-gray-900 hover:bg-white/90 border border-white/80 shadow-sm'
                )}
                aria-label="Ver estoque de veículos"
              >
                Estoque
              </Link>
              <ThemeToggle
                className={cn(
                  'transition-all duration-300 w-11 h-11 flex items-center justify-center',
                  isScrolled
                    ? isLightMode
                      ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
                      : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
                    : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
                )}
              />
              <button
                ref={menuButtonRef}
                type="button"
                id="mobile-menu-button"
                className={cn(
                  'relative w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  // When menu is open, show high contrast button
                  mobileMenuOpen
                    ? isLightMode
                      ? 'bg-gray-200 hover:bg-gray-300 text-gray-900 border border-gray-300 shadow-md'
                      : 'bg-white/30 hover:bg-white/40 text-white border border-white/40 shadow-md'
                    : isScrolled
                      ? isLightMode
                        ? 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200 shadow-sm'
                        : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
                      : 'bg-white/15 hover:bg-white/25 text-white border border-white/25 shadow-lg'
                )}
                style={{
                  filter: !isScrolled && !mobileMenuOpen ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' : 'none'
                }}
                onClick={toggleMenu}
                aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-menu"
                aria-haspopup="true"
              >
                {/* Animated hamburger/X icon - min 24px touch target */}
                <span className="sr-only">{mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}</span>
                <div className="relative w-6 h-5 flex flex-col justify-center items-center" aria-hidden="true">
                  <span
                    className={cn(
                      'absolute h-0.5 w-6 transform transition-all duration-300 ease-in-out rounded-full',
                      mobileMenuOpen
                        ? isLightMode
                          ? 'rotate-45 bg-gray-900'
                          : 'rotate-45 bg-white'
                        : '-translate-y-2 bg-current'
                    )}
                  />
                  <span
                    className={cn(
                      'absolute h-0.5 w-6 bg-current transition-all duration-300 ease-in-out rounded-full',
                      mobileMenuOpen ? 'opacity-0 scale-0' : 'opacity-100 scale-100'
                    )}
                  />
                  <span
                    className={cn(
                      'absolute h-0.5 w-6 transform transition-all duration-300 ease-in-out rounded-full',
                      mobileMenuOpen
                        ? isLightMode
                          ? '-rotate-45 bg-gray-900'
                          : '-rotate-45 bg-white'
                        : 'translate-y-2 bg-current'
                    )}
                  />
                </div>
              </button>
            </div>
          </nav>
        </Container>
      </header>

      {/* Mobile Menu Overlay - Full screen, outside header */}
      <div
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
        aria-hidden={!mobileMenuOpen}
        className={cn(
          'lg:hidden fixed inset-0 z-[100]',
          mobileMenuOpen
            ? 'opacity-100 visible'
            : 'opacity-0 invisible pointer-events-none'
        )}
        style={{ transition: 'opacity 300ms ease, visibility 300ms ease' }}
      >
        {/* Semi-transparent overlay backdrop - reduced opacity for lighter feel */}
        <div
          className={cn(
            "absolute inset-0 backdrop-blur-sm",
            isLightMode ? "bg-black/30" : "bg-black/50"
          )}
          onClick={closeMenu}
          onKeyDown={(e) => e.key === 'Enter' && closeMenu()}
          role="button"
          tabIndex={mobileMenuOpen ? 0 : -1}
          aria-label="Fechar menu"
        />

        {/* Menu panel - lighter background for better readability */}
        <div
          ref={menuPanelRef}
          className={cn(
            'absolute top-0 left-0 right-0 bottom-0 transform overflow-y-auto overscroll-contain',
            mobileMenuOpen ? 'translate-y-0' : '-translate-y-8'
          )}
          style={{
            // Lighter backgrounds: #2a2a2a (dark mode), #fafafa (light mode)
            backgroundColor: isLightMode ? '#fafafa' : '#2a2a2a',
            transition: 'transform 300ms ease-out'
          }}
        >
          {/* Close button header - visible at top of menu panel */}
          <div className={cn(
            'sticky top-0 z-10 flex items-center justify-between h-20 px-6 border-b',
            isLightMode
              ? 'bg-[#fafafa] border-gray-200'
              : 'bg-[#2a2a2a] border-white/10'
          )}>
            <span className={cn(
              'text-lg font-semibold',
              isLightMode ? 'text-gray-900' : 'text-white'
            )}>
              Menu
            </span>
            <button
              type="button"
              onClick={closeMenu}
              className={cn(
                'w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                isLightMode
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              )}
              aria-label="Fechar menu"
              tabIndex={mobileMenuOpen ? 0 : -1}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <Container className="py-8 px-6">
            <nav className="flex flex-col gap-0" aria-label="Menu principal">
              {navigation.map((item, index) => (
                <Link
                  key={item.name}
                  ref={index === 0 ? firstLinkRef : index === navigation.length - 1 ? lastLinkRef : undefined}
                  href={item.href}
                  className={cn(
                    'text-xl sm:text-2xl font-semibold py-4 sm:py-5 transition-all duration-200',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    // Add border-b only if not the last item
                    index < navigation.length - 1 && (isLightMode ? 'border-b border-gray-200' : 'border-b border-white/10'),
                    isLightMode
                      ? 'text-gray-900 hover:text-primary active:text-primary'
                      : 'text-white hover:text-primary active:text-primary',
                    mobileMenuOpen
                      ? 'translate-x-0 opacity-100'
                      : '-translate-x-4 opacity-0'
                  )}
                  style={{
                    transitionDelay: mobileMenuOpen ? `${index * 40 + 50}ms` : '0ms'
                  }}
                  onClick={closeMenu}
                  tabIndex={mobileMenuOpen ? 0 : -1}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Additional info in menu */}
            <div
              className={cn(
                'mt-10 pt-6 border-t transition-all duration-300',
                isLightMode ? 'border-gray-200' : 'border-white/10',
                mobileMenuOpen ? 'opacity-100' : 'opacity-0'
              )}
              style={{ transitionDelay: mobileMenuOpen ? '300ms' : '0ms' }}
            >
              <p className={cn(
                'text-sm',
                isLightMode ? 'text-gray-500' : 'text-white/50'
              )}>
                Attra Veículos © {new Date().getFullYear()}
              </p>
            </div>
          </Container>
        </div>
      </div>
    </>
  )
}

