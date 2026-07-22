import { describe, it, expect } from 'vitest'
import { buildFykosAttribution, formatAttributionLine } from '../fykos'

describe('buildFykosAttribution', () => {
  it('sem tráfego nem fonte → null', () => {
    expect(buildFykosAttribution(undefined, undefined)).toBeNull()
    expect(buildFykosAttribution({}, undefined)).toBeNull()
  })

  it('inclui só os campos preenchidos, em snake_case', () => {
    const attr = buildFykosAttribution(
      { utmSource: 'google', utmCampaign: 'black-friday', utmTerm: 'comprar carro usado', gclid: 'abc123' },
      'Google Ads',
    )
    expect(attr).toEqual({
      lead_source: 'Google Ads',
      utm_source: 'google',
      utm_campaign: 'black-friday',
      utm_term: 'comprar carro usado',
      gclid: 'abc123',
    })
  })

  it('ignora strings vazias / só espaços', () => {
    const attr = buildFykosAttribution({ utmSource: '  ', utmCampaign: 'promo' }, undefined)
    expect(attr).toEqual({ utm_campaign: 'promo' })
  })

  it('captura utm_term e utm_campaign (o objetivo do fix)', () => {
    const attr = buildFykosAttribution({ utmCampaign: 'verao2026', utmTerm: 'suv 7 lugares' })
    expect(attr?.utm_campaign).toBe('verao2026')
    expect(attr?.utm_term).toBe('suv 7 lugares')
  })
})

describe('formatAttributionLine', () => {
  it('null → null', () => {
    expect(formatAttributionLine(null)).toBeNull()
  })

  it('monta linha legível com campanha e termo em destaque', () => {
    const line = formatAttributionLine({
      lead_source: 'Google Ads',
      utm_campaign: 'black-friday',
      utm_term: 'comprar carro usado',
      gclid: 'abc123',
    })
    expect(line).toBe('Origem: Google Ads · Campanha: black-friday · Termo: comprar carro usado · gclid: abc123')
  })

  it('usa utm_source como Fonte quando não há lead_source', () => {
    expect(formatAttributionLine({ utm_source: 'newsletter', utm_medium: 'email' }))
      .toBe('Fonte: newsletter · Mídia: email')
  })
})
