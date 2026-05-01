import Link from 'next/link'
import { BookOpen, ArrowRight } from 'lucide-react'
import type { PillarChildLink } from '@/types'
import { Container } from '@/components/ui/container'

interface PillarTOCProps {
  intro?: string
  items: PillarChildLink[]
}

/**
 * Pillar page table of contents — lists child posts grouped under this hub.
 * Renders only when the parent EducativoFields has is_pillar=true.
 */
export function PillarTOC({ intro, items }: PillarTOCProps) {
  if (!items || items.length === 0) return null

  return (
    <section className="py-12 lg:py-16 bg-background-soft border-y border-border">
      <Container size="lg">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground">
              Neste guia
            </h2>
          </div>

          {intro && (
            <p className="text-foreground-secondary leading-relaxed mb-8 whitespace-pre-line">
              {intro}
            </p>
          )}

          <ul className="space-y-3">
            {items.map((c, i) => (
              <li key={c.slug}>
                <Link
                  href={`/blog/${c.slug}`}
                  className="flex items-center justify-between gap-4 p-4 lg:p-5 bg-background rounded-xl border border-border hover:border-primary/40 transition-colors group"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-sm font-mono text-foreground-secondary/60 w-6">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {c.label || c.slug}
                    </span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-foreground-secondary/60 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  )
}
