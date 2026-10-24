'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } }
  }
}

const SCRIPT = 'https://www.instagram.com/embed.js'

/**
 * Post do Instagram incorporado como o próprio Instagram mostra: foto ou
 * carrossel, legenda, curtidas e comentários (`data-instgrm-captioned`). O
 * script do Instagram só é pedido quando o post chega perto da tela; até lá,
 * e sem JavaScript, fica o link para o post.
 */
export function PostInstagram({ url, className }: { url: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const caixa = ref.current
    if (!caixa) return
    const carregar = () => {
      if (window.instgrm) {
        window.instgrm.Embeds.process()
        return
      }
      if (document.querySelector(`script[src="${SCRIPT}"]`)) return
      const s = document.createElement('script')
      s.src = SCRIPT
      s.async = true
      document.body.appendChild(s)
    }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      carregar()
    }, { rootMargin: '600px 0px' })
    io.observe(caixa)
    return () => io.disconnect()
  }, [url])

  return (
    <div ref={ref} className={className}>
      <blockquote
        className="instagram-media"
        data-instgrm-captioned
        data-instgrm-permalink={`${url}?utm_source=ig_embed&utm_campaign=loading`}
        data-instgrm-version="14"
        style={{ background: '#fff', border: 0, borderRadius: 12, margin: 0, maxWidth: 540, minWidth: 326, width: '100%' }}
      >
        <a href={url} target="_blank" rel="noopener noreferrer" className="block p-6 text-center text-[15px] font-medium text-[#111]">
          Ver este post no Instagram
        </a>
      </blockquote>
    </div>
  )
}
