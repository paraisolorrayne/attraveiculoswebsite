'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Play } from 'lucide-react'

const ID = 'Y1UA3pYc7TE'

/**
 * Vídeo "Conheça a Attra" de /jornada. Até 23/10/2026 o player do YouTube
 * carregava junto com a página, antes de alguém dar play, e mostrava o
 * "Watch on YouTube" por cima. Agora fica só a capa (a do próprio YouTube) com
 * um botão; o player entra no clique, já tocando, pelo domínio sem cookies.
 */
export function VideoConheca() {
  const [tocar, setTocar] = useState(false)

  return (
    <div data-revelar="cortina" className="relative aspect-video overflow-hidden rounded-2xl bg-black">
      {tocar ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${ID}?autoplay=1&rel=0&modestbranding=1`}
          title="Attra Veículos: conheça a Attra"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setTocar(true)}
          aria-label="Assistir ao vídeo Conheça a Attra"
          className="group absolute inset-0"
        >
          <Image
            src={`https://i.ytimg.com/vi/${ID}/maxresdefault.jpg`}
            alt=""
            fill
            sizes="(min-width: 1024px) 896px, 100vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
          <span className="absolute inset-0 bg-black/30 transition-colors group-hover:bg-black/20" />
          <span className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-black shadow-xl transition-transform group-hover:scale-105">
            <Play className="ml-1 h-8 w-8 fill-current" />
          </span>
        </button>
      )}
    </div>
  )
}
