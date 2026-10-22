'use client'

import { useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { cn } from '@/lib/utils'

interface FAQItem {
  question: string
  answer: string
}

interface FAQSectionProps {
  faqs: FAQItem[]
  title?: string
  subtitle?: string
  className?: string
}

export function FAQSection({ 
  faqs, 
  title = 'Perguntas Frequentes',
  subtitle = 'Tire suas dúvidas sobre a Attra Veículos',
  className = ''
}: FAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section className={`py-16 lg:py-24 bg-background-soft ${className}`}>
      <Container size="2xl">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full mb-4">
              <HelpCircle className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">FAQ</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">
              {title}
            </h2>
            <p className="text-foreground-secondary max-w-2xl mx-auto">
              {subtitle}
            </p>
          </div>

          {/* FAQ Items */}
          <div data-revelar className="space-y-3">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-background border border-border rounded-xl overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-background-soft/50 transition-colors"
                >
                  <h3 className="text-base lg:text-lg font-semibold text-foreground pr-4">
                    {faq.question}
                  </h3>
                  <ChevronDown 
                    className={cn(
                      "w-5 h-5 text-primary shrink-0 transition-transform duration-300",
                      openIndex === index && "rotate-180"
                    )}
                  />
                </button>
                <div 
                  className={cn(
                    "overflow-hidden transition-all duration-300",
                    openIndex === index ? "max-h-96" : "max-h-0"
                  )}
                >
                  <p className="px-6 pb-5 text-foreground-secondary leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}

