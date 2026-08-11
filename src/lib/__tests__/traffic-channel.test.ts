import { describe, it, expect } from 'vitest'
import {
  chaveCampanha,
  classificarCanal,
  normalizarCampanha,
  normalizarFonte,
  rotuloCampanha,
  rotuloCanal,
  corCanal,
  CANAIS_ORDEM,
  CANAL_ROTULOS,
  SEM_CAMPANHA,
  SEM_FONTE,
  VALORES_NULOS_LISTA,
  type CanalTrafego,
  type SessaoAtribuicao,
} from '../traffic-channel'

describe('classificarCanal — os 5 casos reais da base', () => {
  it('facebook/cpc (6.336 sessões) → social pago', () => {
    expect(classificarCanal({ utm_source: 'facebook', utm_medium: 'cpc' })).toBe('social_pago')
  })

  it('Google/cpc (2.887 sessões) → busca paga', () => {
    expect(classificarCanal({ utm_source: 'Google', utm_medium: 'cpc' })).toBe('busca_paga')
  })

  it('sem UTM e sem referrer (6.962 sessões) → direto', () => {
    expect(classificarCanal({})).toBe('direto')
  })

  it('ig/social (190 sessões) → social orgânico', () => {
    expect(classificarCanal({ utm_source: 'ig', utm_medium: 'social' })).toBe('social_organico')
  })

  it('referrer chatgpt.com (9 sessões, maior conversão) → assistente de IA', () => {
    expect(classificarCanal({ referrer_domain: 'chatgpt.com' })).toBe('assistente_ia')
  })
})

describe('classificarCanal — utm_medium sujo', () => {
  it('"pi-cpc" é pago (substring, não igualdade)', () => {
    expect(classificarCanal({ utm_source: 'facebook', utm_medium: 'pi-cpc' })).toBe('social_pago')
    expect(classificarCanal({ utm_source: 'google', utm_medium: 'pi-cpc' })).toBe('busca_paga')
  })

  it('variações de mídia paga', () => {
    for (const medium of ['CPC', 'ppc', 'paid', 'paidsocial', 'paid-social', 'display', 'remarketing', 'ads']) {
      expect(classificarCanal({ utm_source: 'google', utm_medium: medium })).toBe('busca_paga')
    }
  })

  it('"leads" não é pago — contém "ads" mas não é mídia comprada', () => {
    expect(classificarCanal({ utm_source: 'google', utm_medium: 'leads' })).toBe('busca_organica')
  })

  it('valores nulos gravados como texto equivalem a vazio', () => {
    expect(classificarCanal({ utm_medium: '(not set)', gclid: 'Cj0Kabc' })).toBe('busca_paga')
    expect(classificarCanal({ utm_source: '(direct)', utm_medium: '(none)' })).toBe('direto')
  })
})

describe('classificarCanal — normalização de caixa e espaços', () => {
  it('"Google" e "google" caem no mesmo canal', () => {
    const a = classificarCanal({ utm_source: 'Google', utm_medium: 'CPC' })
    const b = classificarCanal({ utm_source: '  google  ', utm_medium: ' cpc ' })
    expect(a).toBe(b)
    expect(a).toBe('busca_paga')
  })

  it('"IG", "Instagram", "FB", "facebook" e "Meta" são o mesmo ecossistema social', () => {
    for (const fonte of ['IG', 'Instagram', 'FB', 'facebook', 'Meta']) {
      expect(classificarCanal({ utm_source: fonte, utm_medium: 'cpc' })).toBe('social_pago')
      expect(classificarCanal({ utm_source: fonte, utm_medium: 'social' })).toBe('social_organico')
    }
  })

  it('"ig" só casa por igualdade — "digital" contém "ig" e não vira social', () => {
    expect(classificarCanal({ utm_source: 'digital', utm_medium: 'banner' })).toBe('outro')
  })
})

describe('classificarCanal — click ids sem UTM', () => {
  it('gclid sem UTM → busca paga do Google', () => {
    expect(classificarCanal({ gclid: 'Cj0KCQjw_abc123' })).toBe('busca_paga')
  })

  it('fbclid sem UTM → social pago da Meta', () => {
    expect(classificarCanal({ fbclid: 'IwAR0abc123' })).toBe('social_pago')
  })

  it('ttclid sem UTM → social pago (TikTok)', () => {
    expect(classificarCanal({ ttclid: 'E.C.P.abc' })).toBe('social_pago')
  })

  it('utm_medium explícito vence o click id (fbclid vem colado em link orgânico da Meta)', () => {
    expect(classificarCanal({ utm_source: 'ig', utm_medium: 'social', fbclid: 'IwAR0abc' }))
      .toBe('social_organico')
  })
})

describe('classificarCanal — assistentes de IA', () => {
  it.each([
    ['chatgpt.com', 'assistente_ia'],
    ['https://chatgpt.com/c/123', 'assistente_ia'],
    ['perplexity.ai', 'assistente_ia'],
    ['copilot.microsoft.com', 'assistente_ia'],
    ['gemini.google.com', 'assistente_ia'],
    ['claude.ai', 'assistente_ia'],
  ])('referrer %s → %s', (referrer, esperado) => {
    expect(classificarCanal({ referrer_domain: referrer })).toBe(esperado as CanalTrafego)
  })

  it('gemini.google.com não pode ser confundido com busca orgânica do Google', () => {
    expect(classificarCanal({ referrer_domain: 'gemini.google.com' })).not.toBe('busca_organica')
  })
})

describe('classificarCanal — orgânico e referência', () => {
  it.each(['google.com', 'www.google.com.br', 'bing.com', 'duckduckgo.com'])(
    'referrer %s sem marcador de pago → busca orgânica',
    (referrer) => {
      expect(classificarCanal({ referrer_domain: referrer })).toBe('busca_organica')
    },
  )

  it('referrer social sem UTM → social orgânico', () => {
    expect(classificarCanal({ referrer_domain: 'l.instagram.com' })).toBe('social_organico')
    expect(classificarCanal({ referrer_domain: 'm.facebook.com' })).toBe('social_organico')
  })

  it('qualquer outro referrer externo → referência', () => {
    expect(classificarCanal({ referrer_domain: 'webmotors.com.br' })).toBe('referencia')
  })

  it('referrer do próprio domínio é navegação interna, não referência → direto', () => {
    expect(classificarCanal({ referrer_domain: 'attraveiculos.com.br' })).toBe('direto')
    expect(classificarCanal({ referrer_domain: 'www.attraveiculos.com.br' })).toBe('direto')
    expect(classificarCanal({ referrer_domain: 'https://attraveiculos.com.br/veiculo/porsche-911' }))
      .toBe('direto')
  })

  it('UTM de plataforma desconhecida → outro', () => {
    expect(classificarCanal({ utm_source: 'newsletter', utm_medium: 'email' })).toBe('outro')
  })
})

// A regra do referrer é comparação por FRONTEIRA DE HOST — rótulo DNS inteiro ou domínio
// inteiro —, nunca substring. Com substring, 'olx.com.br' contém "x.com" e a OLX (um dos
// maiores referrers de uma concessionária no Brasil) era classificada como social orgânico do
// Twitter: sumia de "Referência" e entrava na tabela que decide verba como se fosse rede social.
describe('classificarCanal — fronteira de host no referrer', () => {
  it.each([
    ['olx.com.br', 'referencia', 'olx.com.br'],
    ['www.olx.com.br', 'referencia', 'olx.com.br'],
    ['sp.olx.com.br', 'referencia', 'sp.olx.com.br'],
    ['x.com', 'social_organico', 'twitter'],
    ['mobile.x.com', 'social_organico', 'twitter'],
    ['t.co', 'social_organico', 'twitter'],
    ['fb.com', 'social_organico', 'meta'],
    ['facebook.com', 'social_organico', 'meta'],
    ['m.facebook.com', 'social_organico', 'meta'],
    ['algumfb.com.br', 'referencia', 'algumfb.com.br'],
  ])('referrer %s → canal %s / fonte %s', (referrer, canal, fonte) => {
    expect(classificarCanal({ referrer_domain: referrer })).toBe(canal as CanalTrafego)
    expect(normalizarFonte({ referrer_domain: referrer })).toBe(fonte)
  })

  // Varredura da tabela inteira de plataformas atrás de outras substrings perigosas: portais de
  // classificados e sites de notícia brasileiros não podem cair em busca/social/IA por acidente.
  it.each([
    'webmotors.com.br',
    'icarros.com.br',
    'maxcarros.com.br',
    'seminovosbh.com.br',
    'meucarronovo.com.br',
    'usadosbr.com',
    'autoline.com.br',
    'mobiauto.com.br',
    'napista.com.br',
    'pix.com.br',
    'oyoutubers.com.br',
    'digitalmais.com.br',
    'metalurgica.com.br',
    'clarobrave.com.br',
    'uol.com.br',
    'g1.globo.com',
    'estadao.com.br',
  ])('%s continua sendo referência (nenhuma substring de plataforma casa)', (referrer) => {
    expect(classificarCanal({ referrer_domain: referrer })).toBe('referencia')
  })

  it('os domínios de verdade das plataformas continuam casando', () => {
    expect(classificarCanal({ referrer_domain: 'www.google.com.br' })).toBe('busca_organica')
    expect(classificarCanal({ referrer_domain: 'br.search.yahoo.com' })).toBe('busca_organica')
    expect(classificarCanal({ referrer_domain: 'search.brave.com' })).toBe('busca_organica')
    expect(classificarCanal({ referrer_domain: 'l.instagram.com' })).toBe('social_organico')
    expect(classificarCanal({ referrer_domain: 'youtu.be' })).toBe('social_organico')
    expect(classificarCanal({ referrer_domain: 'lnkd.in' })).toBe('social_organico')
    expect(classificarCanal({ referrer_domain: 'wa.me' })).toBe('social_organico')
    expect(classificarCanal({ referrer_domain: 'claude.ai' })).toBe('assistente_ia')
  })

  it('t.co é do Twitter e t.me é do Telegram — domínios parecidos, fontes diferentes', () => {
    expect(normalizarFonte({ referrer_domain: 't.co' })).toBe('twitter')
    expect(normalizarFonte({ referrer_domain: 't.me' })).toBe('telegram')
  })
})

// Mídia comprada em plataforma que a lib não sabe nomear precisa continuar legível COMO PAGA.
// Caindo em 'outro' ela ficava indistinguível de e-mail e QR code impresso, e a verba
// desaparecia justamente da tabela que existe para decidir verba.
describe('classificarCanal — mídia paga fora das plataformas conhecidas', () => {
  it.each(['pi-cpc', 'cpc', 'display', 'paid-social', 'ads'])(
    'fonte desconhecida com medium "%s" → outra mídia paga',
    (medium) => {
      expect(classificarCanal({ utm_source: 'portaldecarros', utm_medium: medium })).toBe('outra_midia_paga')
    },
  )

  it('não confunde com e-mail/QR code, que continuam em "outro"', () => {
    expect(classificarCanal({ utm_source: 'newsletter', utm_medium: 'email' })).toBe('outro')
    expect(classificarCanal({ utm_source: 'qrcode', utm_medium: 'impresso' })).toBe('outro')
  })

  it('plataforma conhecida continua indo para o canal específico', () => {
    expect(classificarCanal({ utm_source: 'facebook', utm_medium: 'pi-cpc' })).toBe('social_pago')
    expect(classificarCanal({ utm_source: 'google', utm_medium: 'pi-cpc' })).toBe('busca_paga')
  })
})

describe('classificarCanal — entrada vazia / nula', () => {
  it('todos os campos null → direto', () => {
    expect(
      classificarCanal({
        utm_source: null,
        utm_medium: null,
        utm_campaign: null,
        gclid: null,
        fbclid: null,
        ttclid: null,
        referrer_domain: null,
      }),
    ).toBe('direto')
  })

  it('strings vazias e só espaços → direto', () => {
    expect(classificarCanal({ utm_source: '   ', utm_medium: '', referrer_domain: '  ' })).toBe('direto')
  })

  it('nunca lança e sempre devolve um canal conhecido', () => {
    const entradas = [
      {},
      { referrer_domain: 'não é uma url ::: %%%' },
      { utm_source: '???', utm_medium: '!!!' },
    ]
    for (const entrada of entradas) {
      expect(CANAIS_ORDEM).toContain(classificarCanal(entrada))
    }
  })
})

describe('normalizarCampanha', () => {
  it('null, undefined e vazio viram rótulo estável', () => {
    expect(normalizarCampanha(null)).toBe(SEM_CAMPANHA)
    expect(normalizarCampanha(undefined)).toBe(SEM_CAMPANHA)
    expect(normalizarCampanha('   ')).toBe(SEM_CAMPANHA)
    expect(normalizarCampanha('(not set)')).toBe(SEM_CAMPANHA)
  })

  it('apara espaços mas preserva o nome original da campanha', () => {
    expect(normalizarCampanha('  Black Friday 2026  ')).toBe('Black Friday 2026')
  })

  // Este teste passava sozinho enquanto "Black Friday" e "black friday" viravam DUAS linhas na
  // tabela de campanhas: aparar espaço nunca foi suficiente para agrupar.
  it('a caixa não pode criar duas campanhas — quem agrupa é chaveCampanha', () => {
    const grafias = ['Black Friday 2026', 'black friday 2026', 'BLACK FRIDAY 2026', '  Black  Friday 2026 ']
    const chaves = new Set(grafias.map(chaveCampanha))
    expect(chaves.size).toBe(1)
    expect([...chaves][0]).toBe('black friday 2026')
  })

  it('o rótulo exibido continua legível — nunca a chave em minúsculas', () => {
    expect(normalizarCampanha('Black Friday 2026')).toBe('Black Friday 2026')
    expect(normalizarCampanha('  Black  Friday 2026 ')).toBe('Black Friday 2026')
  })

  it('campanha ausente vira a mesma chave estável', () => {
    expect(chaveCampanha(null)).toBe(SEM_CAMPANHA)
    expect(chaveCampanha('(not set)')).toBe(SEM_CAMPANHA)
    expect(chaveCampanha('   ')).toBe(SEM_CAMPANHA)
  })
})

describe('normalizarFonte', () => {
  it('"Google" e "google" agrupam na mesma fonte', () => {
    expect(normalizarFonte({ utm_source: 'Google' })).toBe('google')
    expect(normalizarFonte({ utm_source: ' google ' })).toBe('google')
  })

  it('"ig", "fb" e "instagram" agrupam em meta', () => {
    expect(normalizarFonte({ utm_source: 'ig' })).toBe('meta')
    expect(normalizarFonte({ utm_source: 'FB' })).toBe('meta')
    expect(normalizarFonte({ utm_source: 'instagram' })).toBe('meta')
  })

  it('sem UTM usa o click id e depois o referrer', () => {
    expect(normalizarFonte({ gclid: 'abc' })).toBe('google')
    expect(normalizarFonte({ fbclid: 'abc' })).toBe('meta')
    expect(normalizarFonte({ referrer_domain: 'chatgpt.com' })).toBe('chatgpt')
    expect(normalizarFonte({ referrer_domain: 'webmotors.com.br' })).toBe('webmotors.com.br')
  })

  it('sem nada (inclusive referrer interno) → rótulo estável', () => {
    expect(normalizarFonte({})).toBe(SEM_FONTE)
    expect(normalizarFonte({ referrer_domain: 'attraveiculos.com.br' })).toBe(SEM_FONTE)
  })
})

/**
 * PARIDADE lib × rota de métricas.
 *
 * A rota /api/admin/visitors/metrics agrega no banco e só depois chama `classificarCanal`. Para
 * isso ela precisa decidir NO SQL o que é "valor vazio" — e essa decisão tem que ser a mesma da
 * lib, senão a mesma sessão sai classificada de dois jeitos em duas tabelas da mesma tela
 * (a de receita passa a linha crua para a lib e não tinha o defeito).
 *
 * `saneadoComoNoSql` é o espelho em JS do que a rota faz em SQL:
 *   nullif(case when lower(btrim(col)) in (VALORES_NULOS_LISTA) then null else btrim(col) end, '')
 * Como as duas pontas leem a MESMA VALORES_NULOS_LISTA, este teste quebra no dia em que alguém
 * mudar uma sem mudar a outra.
 */
function saneadoComoNoSql(valor: string | null | undefined): string | null {
  if (valor === null || valor === undefined) return null
  const aparado = valor.trim()
  if (VALORES_NULOS_LISTA.includes(aparado.toLowerCase())) return null
  return aparado === '' ? null : aparado
}

/** Reproduz a linha que a rota monta a partir do grupo agregado no banco. */
function comoARotaMonta(linha: SessaoAtribuicao): SessaoAtribuicao {
  return {
    utm_source: saneadoComoNoSql(linha.utm_source),
    utm_medium: saneadoComoNoSql(linha.utm_medium),
    utm_campaign: saneadoComoNoSql(linha.utm_campaign),
    // A rota agrega os click ids como booleano de presença (o valor não influencia o canal).
    gclid: saneadoComoNoSql(linha.gclid) !== null ? '1' : null,
    fbclid: saneadoComoNoSql(linha.fbclid) !== null ? '1' : null,
    ttclid: saneadoComoNoSql(linha.ttclid) !== null ? '1' : null,
    referrer_domain: saneadoComoNoSql(linha.referrer_domain),
  }
}

describe('paridade lib × /api/admin/visitors/metrics com valores sujos', () => {
  it.each<[SessaoAtribuicao, CanalTrafego]>([
    [{ utm_source: '(not set)', referrer_domain: 'chatgpt.com' }, 'assistente_ia'],
    [{ utm_source: 'undefined', referrer_domain: 'google.com' }, 'busca_organica'],
    [{ utm_source: '(none)', referrer_domain: 'l.instagram.com' }, 'social_organico'],
    [{ utm_source: 'null', referrer_domain: 'webmotors.com.br' }, 'referencia'],
    [{ utm_source: 'direct', referrer_domain: 'olx.com.br' }, 'referencia'],
    [{ utm_source: '-', utm_medium: '(not set)', referrer_domain: 'bing.com' }, 'busca_organica'],
    // Click id gravado como texto lixo: os dois lados têm que ignorá-lo.
    [{ gclid: 'undefined', referrer_domain: 'webmotors.com.br' }, 'referencia'],
    [{ fbclid: '(not set)' }, 'direto'],
    // E o caso legítimo continua legítimo dos dois lados.
    [{ utm_source: 'facebook', utm_medium: 'cpc', referrer_domain: 'l.facebook.com' }, 'social_pago'],
    [{ utm_medium: '(not set)', gclid: 'Cj0Kabc' }, 'busca_paga'],
  ])('%j → %s na lib e na rota', (linha, esperado) => {
    expect(classificarCanal(linha)).toBe(esperado)
    expect(classificarCanal(comoARotaMonta(linha))).toBe(esperado)
  })

  it('o referrer sujo nunca é descartado antes de a lib olhar para ele', () => {
    // A rota antiga anulava o referrer sempre que utm_source fosse NOT NULL para o SQL —
    // e '(not set)' é NOT NULL. Resultado: "direto" aqui e "assistente de IA" na tabela de receita.
    const linha = { utm_source: '(not set)', referrer_domain: 'chatgpt.com' }
    expect(comoARotaMonta(linha).referrer_domain).toBe('chatgpt.com')
    expect(classificarCanal(comoARotaMonta(linha))).not.toBe('direto')
  })
})

describe('rótulos e cores', () => {
  it('todo canal tem rótulo em português e token de cor', () => {
    for (const canal of CANAIS_ORDEM) {
      expect(rotuloCanal(canal)).toBeTruthy()
      expect(corCanal(canal)).toMatch(/^bg-/)
    }
  })

  it('a ordem cobre exatamente todos os canais, sem repetir', () => {
    const declarados = Object.keys(CANAL_ROTULOS) as CanalTrafego[]
    expect([...CANAIS_ORDEM].sort()).toEqual([...declarados].sort())
    expect(new Set(CANAIS_ORDEM).size).toBe(CANAIS_ORDEM.length)
  })
})

describe('rotuloCampanha — queda para o ID', () => {
	it('usa o nome quando ele vem', () => {
		expect(rotuloCampanha('institucional', '123456')).toBe('institucional')
	})

	it('cai para o ID quando o nome falta — o caso de 725 das 728 sessões pagas', () => {
		// O Google não tem código para o NOME da campanha, só {campaignid}.
		expect(rotuloCampanha(null, '22334455')).toBe('campanha #22334455')
		expect(rotuloCampanha('', '22334455')).toBe('campanha #22334455')
	})

	it('trata o lixo dos coletores como ausência dos dois lados', () => {
		expect(rotuloCampanha('(not set)', '789')).toBe('campanha #789')
		expect(rotuloCampanha(null, '(not set)')).toBe(SEM_CAMPANHA)
		expect(rotuloCampanha(null, '  ')).toBe(SEM_CAMPANHA)
	})

	it('sem nome e sem ID não inventa campanha', () => {
		expect(rotuloCampanha(null, null)).toBe(SEM_CAMPANHA)
	})

	it('bate com o rótulo que o SQL do painel de visitantes monta', () => {
		// metrics/route.ts: 'campanha #' || btrim(s.utm_id)
		expect(rotuloCampanha(null, ' 22334455 ')).toBe('campanha #22334455')
	})
})
