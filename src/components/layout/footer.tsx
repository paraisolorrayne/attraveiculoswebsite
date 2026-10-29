'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Phone, MessageCircle, Mail, MapPin, Clock, Instagram, Facebook, Youtube } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { cn } from '@/lib/utils'
import { PHONE_NUMBER, PHONE_DISPLAY, CELLPHONE_DISPLAY, HORARIO_RESUMIDO, getWhatsAppUrl } from '@/lib/constants'

const quickLinks = [
  { name: 'Veículos', href: '/veiculos' },
  { name: 'Sobre Nós', href: '/sobre' },
  { name: 'Financiamento', href: '/financiamento' },
  { name: 'Compramos seu Carro', href: '/compramos-seu-carro' },
  { name: 'Solicitar Veículo', href: '/solicitar-veiculo' },
  { name: 'Blog', href: '/blog' },
  { name: 'Contato', href: '/contato' },
  { name: 'Manual Attra: Engenharia e Performance', href: '/manual-attra' },
]

const brands = ['Porsche', 'BMW', 'Mercedes-Benz', 'Audi', 'Land Rover', 'Cadillac', 'Lamborghini', 'Ferrari']

export function Footer() {
  const currentYear = new Date().getFullYear()
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Show white logo in dark mode, black logo in light mode
  const showWhiteLogo = mounted && resolvedTheme === 'dark'

  return (
    <footer className="bg-background-card border-t border-border">
      <Container className="py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* About */}
          <div>
            <Link href="/" className="relative flex items-center mb-4 h-11">
              {/* White logo - visible in dark mode */}
              <Image
                src="/images/logo-white.png"
                alt="Attra Veículos"
                width={120}
                height={36}
                className={cn(
                  'h-9 w-auto object-contain transition-opacity duration-300',
                  showWhiteLogo ? 'opacity-100' : 'opacity-0'
                )}
                unoptimized
              />
              {/* Black logo - visible in light mode */}
              <Image
                src="/images/logo-black.png"
                alt="Attra Veículos"
                width={120}
                height={36}
                className={cn(
                  'absolute left-0 h-9 w-auto object-contain transition-opacity duration-300',
                  showWhiteLogo ? 'opacity-0' : 'opacity-100'
                )}
                unoptimized
              />
            </Link>
            <p className="text-foreground-secondary text-sm mb-4">
              Curadoria e comercialização de veículos nacionais, importados, esportivos e supercarros, com operação em Uberlândia e atendimento em todo o Brasil.
            </p>
            <div className="flex gap-3">
              <a href="https://instagram.com/attra.veiculos" target="_blank" rel="noopener noreferrer" aria-label="Instagram da Attra" className="p-3 bg-background hover:bg-primary hover:text-white rounded-lg transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="https://facebook.com/attraveiculos" target="_blank" rel="noopener noreferrer" aria-label="Facebook da Attra" className="p-3 bg-background hover:bg-primary hover:text-white rounded-lg transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="https://youtube.com/@attraveiculos" target="_blank" rel="noopener noreferrer" aria-label="YouTube da Attra" className="p-3 bg-background hover:bg-primary hover:text-white rounded-lg transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-foreground font-semibold mb-4">Links Rápidos</h3>
            {/* No celular, duas colunas com linhas de 44 px (alvo de toque): a
                lista fica até mais curta que a de uma coluna com 28 px. */}
            <ul className="space-y-2 max-md:grid max-md:grid-cols-2 max-md:gap-x-6 max-md:space-y-0">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-foreground-secondary hover:text-primary text-sm transition-colors max-md:block max-md:py-3">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Brands */}
          <div>
            <h3 className="text-foreground font-semibold mb-4">Marcas em Destaque</h3>
            <ul className="space-y-2 max-md:grid max-md:grid-cols-2 max-md:gap-x-6 max-md:space-y-0">
              {brands.map((brand) => (
                <li key={brand}>
                  <Link href={`/veiculos?marca=${brand.toLowerCase()}`} className="text-foreground-secondary hover:text-primary text-sm transition-colors max-md:block max-md:py-3">
                    {brand}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-foreground font-semibold mb-4">Contato</h3>
            <ul className="space-y-3">
              <li>
                <div className="flex items-start gap-2 text-foreground-secondary text-sm">
                  <Phone className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <a href={`tel:${PHONE_NUMBER}`} className="alvo-toque hover:text-primary transition-colors">{PHONE_DISPLAY}</a>
                </div>
              </li>
              <li>
                <div className="flex items-start gap-2 text-foreground-secondary text-sm">
                  <MessageCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <a
                    href={getWhatsAppUrl('Olá! Gostaria de mais informações sobre os veículos disponíveis.')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="alvo-toque hover:text-primary transition-colors"
                  >
                    WhatsApp {CELLPHONE_DISPLAY}
                  </a>
                </div>
              </li>
              <li>
                <a href="mailto:faleconosco@attraveiculos.com.br" className="alvo-toque flex min-w-0 items-start gap-2 text-foreground-secondary hover:text-primary text-sm transition-colors">
                  <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {/* Em Montserrat o endereço passa da coluna em 1024 px: quebra onde precisar. */}
                  <span className="min-w-0 [overflow-wrap:anywhere]">faleconosco@attraveiculos.com.br</span>
                </a>
              </li>
              <li>
                <div className="flex items-start gap-2 text-foreground-secondary text-sm">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Av. Rondon Pacheco, 1670<br />Vigilato Pereira, Uberlândia - MG, 38408-343</span>
                </div>
              </li>
              <li>
                <div className="flex items-start gap-2 text-foreground-secondary text-sm">
                  <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {/* Da mesma constante do JSON-LD e do llms.txt: horário
                      escrito à mão aqui já divergia da ficha do Google. */}
                  <span>{HORARIO_RESUMIDO.split(' · ').map((faixa, i) => (
                    <span key={faixa}>{i > 0 && <br />}{faixa}</span>
                  ))}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </Container>

      {/* Bottom bar */}
      <div className="border-t border-border">
        <Container className="py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-foreground-secondary">
            <p>© {currentYear} Attra Veículos. Todos os direitos reservados.</p>
            <div className="flex gap-4">
              <Link href="/politica-privacidade" className="alvo-toque hover:text-primary transition-colors">Política de Privacidade</Link>
              <Link href="/termos-uso" className="alvo-toque hover:text-primary transition-colors">Termos de Uso</Link>
            </div>
          </div>
        </Container>
      </div>
    </footer>
  )
}

