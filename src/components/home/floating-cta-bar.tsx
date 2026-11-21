'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageCircle, FileText } from 'lucide-react'
import { getWhatsAppUrl } from '@/lib/constants'

/**
 * Floating CTA Bar - Fixed position buttons for WhatsApp and Vehicle Request
 * Tracks clicks for analytics
 */
export function FloatingCTABar() {
  const [isVisible, setIsVisible] = useState(false)
  const [hasScrolled, setHasScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling past hero
      const scrollPosition = window.scrollY
      const shouldShow = scrollPosition > 400

      if (shouldShow && !hasScrolled) {
        setHasScrolled(true)
      }

      setIsVisible(scrollPosition > 400)

      // Track scroll depth
      if (shouldShow && !window.attra_scroll_tracked) {
        window.attra_scroll_tracked = true
        // Dispatch analytics event
        if (window.gtag) {
          window.gtag('event', 'scroll_depth', {
            scroll_depth: '400px',
            page_section: 'home',
          })
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [hasScrolled])

  const handleWhatsAppClick = () => {
    if (window.gtag) {
      window.gtag('event', 'click_cta', {
        cta_type: 'whatsapp',
        cta_position: 'floating_bar',
        page_section: 'home',
      })
    }
  }

  const handleRequestVehicleClick = () => {
    if (window.gtag) {
      window.gtag('event', 'click_cta', {
        cta_type: 'request_vehicle',
        cta_position: 'floating_bar',
        page_section: 'home',
      })
    }
  }

  return (
    <>
      {/* Floating CTA Bar - Fixed at bottom right */}
      <div
        className={`fixed bottom-6 right-6 flex flex-col gap-3 z-40 transition-all duration-300 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-32 pointer-events-none'
        }`}
      >
        {/* WhatsApp Button */}
        <a
          href={getWhatsAppUrl()}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleWhatsAppClick}
          className="flex items-center justify-center w-14 h-14 bg-green-700 hover:bg-green-800 text-white rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-110 active:scale-95"
          title="Conversar no WhatsApp"
          aria-label="Abrir WhatsApp"
        >
          <MessageCircle className="w-6 h-6" />
        </a>

        {/* Request Vehicle Button */}
        <Link
          href="/solicitar-veiculo"
          onClick={handleRequestVehicleClick}
          className="flex items-center justify-center w-14 h-14 bg-primary hover:bg-primary-hover text-white rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-110 active:scale-95"
          title="Solicitar Veículo"
          aria-label="Solicitar um veículo"
        >
          <FileText className="w-6 h-6" />
        </Link>
      </div>

      {/* Mobile-optimized vertical label (hidden on small screens) */}
      <div
        className={`fixed right-0 bottom-24 hidden sm:flex flex-col gap-8 pr-2 z-40 transition-all duration-300 ${
          isVisible ? 'opacity-50 hover:opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <span className="text-xs text-foreground-secondary font-medium uppercase tracking-wide whitespace-nowrap rotate-90 origin-right translate-x-3 -translate-y-6">
          Contato Rápido
        </span>
      </div>
    </>
  )
}

// Declare global window type for TypeScript
declare global {
  interface Window {
    attra_scroll_tracked?: boolean
  }
}
