import Image from 'next/image'
import Link from 'next/link'
import { MessageCircle, Car, MapPin, Instagram, Youtube, ChevronRight, ArrowRight, Star } from 'lucide-react'
import { getWhatsAppUrl, SITE_URL } from '@/lib/constants'
import { estoqueDaBio, escolherDestaque } from '@/lib/destaque-da-bio'
import { formatPrice, formatMileage } from '@/lib/utils'

// O destaque é um carro à venda agora: sem a cópia da página em cache, que
// mostraria um carro já vendido (ver src/lib/destaque-da-bio.ts).
export const dynamic = 'force-dynamic'

export default async function LinksPage() {
  const featuredVehicle = escolherDestaque(await estoqueDaBio())

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
        <span className="block">Automóveis extraordinários.</span>
        <span className="block">Escolhas com confiança.</span>
      </h1>

      {/* Main CTAs */}
      <div className="w-full max-w-sm flex flex-col gap-3 mb-8">
        {/* Primary CTA - WhatsApp */}
        <a
          href={getWhatsAppUrl('Olá! Vim pelo link da bio e gostaria de iniciar o processo de escolha.')}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between bg-[#0F7B6C] hover:bg-[#0C6A5D] text-white rounded-xl px-5 py-4 transition-colors active:scale-[0.98]"
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
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Veículo disponível</h2>
          <a
            href={`${SITE_URL}/veiculo/${featuredVehicle.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
          >
            {/* Foto limpa: as fotos da AutoConf costumam trazer uma faixa gravada
                embaixo, e o nome por cima dela ficava ilegível. */}
            <div className="relative aspect-[16/10] bg-gray-100 dark:bg-gray-900">
              <Image
                src={featuredVehicle.photos[0]}
                alt={`${featuredVehicle.brand} ${featuredVehicle.model}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 400px"
              />
            </div>
            <div className="p-4">
              <p className="text-base font-bold uppercase tracking-wide text-gray-900 dark:text-white">
                {featuredVehicle.brand} {featuredVehicle.model}
              </p>
              <p className="mt-1 text-[0.8125rem] text-gray-600 dark:text-gray-400">
                {featuredVehicle.year_model} · {featuredVehicle.mileage === 0 ? '0 km' : formatMileage(featuredVehicle.mileage)}
              </p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <p className="text-base font-semibold tabular-nums text-gray-900 dark:text-white">{formatPrice(featuredVehicle.price)}</p>
                <span className="flex items-center gap-1 whitespace-nowrap text-[0.8125rem] font-medium text-primary dark:text-red-400">
                  Ver ficha <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </a>
        </div>
      )}

      {/* Endereço e orientações de chegada */}
      <div className="w-full max-w-sm border border-gray-200 dark:border-gray-800 rounded-xl p-5 mb-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Endereço e orientações de chegada</h2>
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

      {/* Avaliação no Google */}
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
              <span className="font-semibold text-sm block">Avalie sua experiência</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Seu feedback nos ajuda a evoluir</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        </a>
      </div>

      {/* Social icons */}
      <div className="flex gap-3 mt-4 mb-6">
        <a href="https://www.instagram.com/attra.veiculos" target="_blank" rel="noopener noreferrer" className="p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors" aria-label="Instagram">
          <Instagram className="w-5 h-5" />
        </a>
        <a href="https://www.youtube.com/@attraveiculos" target="_blank" rel="noopener noreferrer" className="p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors" aria-label="YouTube">
          <Youtube className="w-5 h-5" />
        </a>
      </div>

      {/* Footer */}
      <Link href="/politica-privacidade" className="inline-block py-3.5 px-2 text-gray-500 dark:text-gray-400 text-xs hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
        Política de Privacidade
      </Link>
    </div>
  )
}