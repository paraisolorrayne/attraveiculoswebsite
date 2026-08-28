import Image from 'next/image'
import Link from 'next/link'
import { MessageCircle, Car, MapPin, Instagram, Youtube, ChevronRight, ArrowRight, Star } from 'lucide-react'
import { getWhatsAppUrl, SITE_URL } from '@/lib/constants'
import { getVehicles } from '@/lib/autoconf-api'
import { formatPrice, formatMileage } from '@/lib/utils'

export default async function LinksPage() {
  // Fetch 3 premium vehicles (R$1M–5M), sorted by highest price, pick one randomly
  let featuredVehicle = null
  try {
    const result = await getVehicles({
      tipo: 'carros',
      registros_por_pagina: 20,
      ordenar: 'preco',
      ordem: 'desc',
      preco_de: 1000000,
      preco_ate: 5000000,
    })
    // Filter client-side to guarantee price range (fallback/mock data may ignore filters)
    const eligible = result.vehicles.filter(v => v.price >= 1000000 && v.price <= 5000000)
    const top3 = eligible.slice(0, 5)
    if (top3.length > 0) {
      // True random pick (changes on every request/revalidation)
      const randomIndex = Math.floor(Math.random() * top3.length)
      featuredVehicle = top3[randomIndex]
    }
  } catch (e) {
    console.error('Failed to fetch featured vehicle for links page:', e)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center px-5 py-10 sm:py-14">
      {/* Logo — light: black, dark: white */}
      <div className="mb-8 h-10">
        <Image
          src="/images/logo-black.png"
          alt="Attra Veículos"
          width={140}
          height={42}
          className="h-10 w-auto object-contain dark:hidden"
          priority
          unoptimized
        />
        <Image
          src="/images/logo-white.png"
          alt="Attra Veículos"
          width={140}
          height={42}
          className="h-10 w-auto object-contain hidden dark:block"
          priority
          unoptimized
        />
      </div>

      {/* Headline */}
      <h1 className="text-gray-900 dark:text-white text-xl sm:text-2xl font-bold text-center leading-snug max-w-xs mb-8">
        Onde carros exclusivos encontram escolhas seguras.
      </h1>

      {/* Main CTAs */}
      <div className="w-full max-w-sm flex flex-col gap-3 mb-8">
        {/* Primary CTA - WhatsApp */}
        <a
          href={getWhatsAppUrl('Olá! Vim pelo link da bio e gostaria de iniciar o processo de escolha.')}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between bg-green-500 hover:bg-green-600 text-white rounded-xl px-5 py-4 transition-colors active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <MessageCircle className="w-5 h-5" />
            <span className="font-semibold text-sm">Fale diretamente conosco</span>
          </div>
          <ChevronRight className="w-5 h-5 text-white/60" />
        </a>

        {/* Secondary CTA - Vehicles */}
        <a
          href={`${SITE_URL}/veiculos`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 text-gray-900 dark:text-white rounded-xl px-5 py-4 transition-colors active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <Car className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span className="font-semibold text-sm">Veículos disponíveis</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        </a>
      </div>

      {/* Exemplo Recente de Curadoria */}
      {featuredVehicle && (
        <div className="w-full max-w-sm mb-6">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">Veículo Disponível</h2>
          <a
            href={`${SITE_URL}/veiculo/${featuredVehicle.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
          >
            {/* Vehicle image with overlay info */}
            <div className="relative aspect-[16/9] bg-gray-900">
              {featuredVehicle.photos?.[0] && (
                <Image
                  src={featuredVehicle.photos[0]}
                  alt={`${featuredVehicle.brand} ${featuredVehicle.model}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 400px"
                />
              )}
              {/* Overlay with vehicle name */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="text-white font-bold text-lg tracking-wide">
                  {featuredVehicle.brand.toUpperCase()} {featuredVehicle.model.toUpperCase()}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                  <span className="text-white/80 text-xs">{featuredVehicle.year_model}</span>
                  <span className="text-white/80 text-xs">{featuredVehicle.mileage === 0 ? '0 km' : formatMileage(featuredVehicle.mileage)}</span>
                  <span className="text-white/80 text-xs">{formatPrice(featuredVehicle.price)}</span>
                </div>
              </div>
            </div>
            {/* Caption */}
            <div className="p-4">
              <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Selecionado por configuração e histórico</p>
              <p className="text-xs text-primary flex items-center gap-1 mt-1">
                Ver outros disponíveis <ArrowRight className="w-3 h-3" />
              </p>
            </div>
          </a>
        </div>
      )}

      {/* Endereço e orientações de chegada */}
      <div className="w-full max-w-sm border border-gray-200 dark:border-gray-800 rounded-xl p-5 mb-6">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Endereço e orientações de chegada</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Vem de outra cidade? Encontre aqui todas as instruções necessárias para você nos encontrar com facilidade.
        </p>
        <a
          href="https://maps.google.com/?q=Attra+Veiculos+Uberlandia"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 rounded-xl px-4 py-3 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Abrir localização da unidade</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        </a>
      </div>

      {/* Avaliar experiência com a Attra */}
      <div className="w-full max-w-sm mb-6">
        <a
          href="https://g.page/r/CQHb-QTnsh8hEBM/review"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 text-gray-900 dark:text-white rounded-xl px-5 py-4 transition-colors active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <Star className="w-5 h-5 text-yellow-500" />
            <div>
              <span className="font-semibold text-sm block">Avaliar minha experiência com a Attra</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Seu feedback nos ajuda a evoluir</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        </a>
      </div>

      {/* Social icons */}
      <div className="flex gap-4 mt-4 mb-8">
        <a href="https://instagram.com/attra.veiculos" target="_blank" rel="noopener noreferrer" className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" aria-label="Instagram">
          <Instagram className="w-5 h-5" />
        </a>
        <a href="https://youtube.com/@attraveiculos" target="_blank" rel="noopener noreferrer" className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" aria-label="YouTube">
          <Youtube className="w-5 h-5" />
        </a>
      </div>

      {/* Footer */}
      <Link href="/politica-de-privacidade" className="text-gray-400 text-xs hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
        Política de Privacidade
      </Link>
    </div>
  )
}