import { describe, it, expect } from 'vitest'
import {
  getPageType,
  getVehicleSlugFromPath,
  getVehicleIdFromSlug,
  getTrustedVehicleIdFromSlug,
  shouldSendHeartbeat,
  activeSegmentMs,
  activeDwellSeconds,
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_IDLE_TIMEOUT_MS,
  MAX_HEARTBEAT_GAP_SECONDS,
  MAX_SESSION_DURATION_SECONDS,
} from '../visitor-tracking'

const AGORA = 1_700_000_000_000
const MIN = 60_000

describe('getPageType', () => {
  it('/veiculo/<slug> (singular) é página de veículo', () => {
    expect(getPageType('/veiculo/ferrari-296-2025-1005112')).toBe('vehicle')
    expect(getPageType('/veiculo/porsche-911-carrera-2024-295110')).toBe('vehicle')
    // Barra final não pode descaracterizar o detalhe
    expect(getPageType('/veiculo/ferrari-296-2025-1005112/')).toBe('vehicle')
  })

  it('/veiculos (plural) continua sendo a listagem', () => {
    expect(getPageType('/veiculos')).toBe('vehicles')
  })

  it('/veiculos/ não pode virar detalhe de veículo', () => {
    expect(getPageType('/veiculos/')).not.toBe('vehicle')
    expect(getPageType('/veiculos/')).toBe('vehicles')
    // /veiculo sem slug também é listagem, não detalhe
    expect(getPageType('/veiculo')).toBe('vehicles')
    expect(getPageType('/veiculo/')).toBe('vehicles')
  })

  it('mantém os outros tipos', () => {
    expect(getPageType('/')).toBe('home')
    expect(getPageType('/blog/x')).toBe('blog')
    expect(getPageType('/blog')).toBe('blog')
    expect(getPageType('/contato')).toBe('contact')
    expect(getPageType('/sobre')).toBe('about')
    expect(getPageType('/quem-somos')).toBe('about')
    expect(getPageType('/financiamento')).toBe('other')
  })
})

describe('getVehicleSlugFromPath', () => {
  it('extrai o slug apenas de /veiculo/<slug>', () => {
    expect(getVehicleSlugFromPath('/veiculo/ferrari-296-2025-1005112')).toBe('ferrari-296-2025-1005112')
    expect(getVehicleSlugFromPath('/veiculo/ferrari-296-2025-1005112/')).toBe('ferrari-296-2025-1005112')
  })

  it('listagem e demais rotas não têm slug', () => {
    expect(getVehicleSlugFromPath('/veiculos')).toBeNull()
    expect(getVehicleSlugFromPath('/veiculos/')).toBeNull()
    expect(getVehicleSlugFromPath('/veiculo')).toBeNull()
    expect(getVehicleSlugFromPath('/veiculo/')).toBeNull()
    expect(getVehicleSlugFromPath('/blog/ferrari-296')).toBeNull()
  })
})

describe('getVehicleIdFromSlug', () => {
  it('pega o ID numérico do fim do slug', () => {
    expect(getVehicleIdFromSlug('ferrari-296-2025-1005112')).toBe('1005112')
    expect(getVehicleIdFromSlug('land-rover-defender-2023-989248')).toBe('989248')
  })

  it('slug sem ID numérico no fim → null', () => {
    expect(getVehicleIdFromSlug('ferrari-296-gtb')).toBeNull()
    expect(getVehicleIdFromSlug('1005112')).toBeNull() // sem o hífen separador
    expect(getVehicleIdFromSlug('')).toBeNull()
  })

  // Este é o caso que a bateria antiga não cobria e que fazia o extrator cru
  // parecer seguro: em slug legado/malformado ele devolve o ANO como se fosse
  // o ID. Por isso ninguém pode gravar no banco o que sai daqui — use
  // getTrustedVehicleIdFromSlug.
  it('em slug legado devolve o ANO, não o ID (extrator cru, sem validação)', () => {
    expect(getVehicleIdFromSlug('gol-1-6-2020')).toBe('2020')
    expect(getVehicleIdFromSlug('civic-2019')).toBe('2019')
  })
})

describe('getTrustedVehicleIdFromSlug', () => {
  it('aceita o ID do slug canônico marca-modelo-ANO-ID', () => {
    expect(getTrustedVehicleIdFromSlug('ferrari-296-2025-1005112')).toBe('1005112')
    expect(getTrustedVehicleIdFromSlug('land-rover-defender-2023-989248')).toBe('989248')
    expect(getTrustedVehicleIdFromSlug('porsche-911-carrera-2024-295110')).toBe('295110')
  })

  it('recusa slug legado em que o último número é o ano', () => {
    // O caso que colocava marca/modelo/preço de OUTRO carro no page view:
    // "2020" é um id perfeitamente válido na AutoConf.
    expect(getTrustedVehicleIdFromSlug('gol-1-6-2020')).toBeNull()
    expect(getTrustedVehicleIdFromSlug('civic-2019')).toBeNull()
    expect(getTrustedVehicleIdFromSlug('onix-1-0-turbo-1998')).toBeNull()
  })

  it('aceita ID que não pode ser ano mesmo sem o ano no slug', () => {
    // AutoConf sem anomodelo gera slug "marca-modelo-ID"; o ID de 6-7 dígitos
    // não tem como ser confundido com um ano.
    expect(getTrustedVehicleIdFromSlug('honda-civic-1005112')).toBe('1005112')
    expect(getTrustedVehicleIdFromSlug('honda-civic-123')).toBe('123')
  })

  it('aceita ID de 4 dígitos quando o ano vem antes dele', () => {
    expect(getTrustedVehicleIdFromSlug('gol-1-6-2020-2020')).toBe('2020')
    expect(getTrustedVehicleIdFromSlug('fusca-1970-42')).toBe('42')
  })

  it('recusa o que não é ID: sem número, número absurdo, vazio', () => {
    expect(getTrustedVehicleIdFromSlug('ferrari-296-gtb')).toBeNull()
    expect(getTrustedVehicleIdFromSlug('')).toBeNull()
    expect(getTrustedVehicleIdFromSlug('carro-123456789012345')).toBeNull()
  })
})

describe('parâmetros do heartbeat', () => {
  // O servidor soma, por ping, no máximo MAX_HEARTBEAT_GAP_SECONDS à duração da
  // sessão. Se o intervalo do cliente passar desse teto, toda sessão passa a ser
  // subcontada em silêncio — este teste trava os dois números juntos.
  it('o intervalo do cliente cabe na folga aceita pelo servidor', () => {
    expect(MAX_HEARTBEAT_GAP_SECONDS).toBeGreaterThanOrEqual(
      (HEARTBEAT_INTERVAL_MS / 1000) * 2,
    )
  })

  it('a duração de uma sessão tem teto', () => {
    expect(MAX_SESSION_DURATION_SECONDS).toBeGreaterThan(0)
    expect(MAX_SESSION_DURATION_SECONDS).toBeLessThanOrEqual(24 * 60 * 60)
  })

  it('o heartbeat para bem antes de a sessão bater o teto', () => {
    expect(HEARTBEAT_IDLE_TIMEOUT_MS).toBeGreaterThan(HEARTBEAT_INTERVAL_MS)
    expect(HEARTBEAT_IDLE_TIMEOUT_MS / 1000).toBeLessThan(MAX_SESSION_DURATION_SECONDS)
  })
})

describe('shouldSendHeartbeat', () => {
  it('conta enquanto a aba está à frente e há interação recente', () => {
    expect(shouldSendHeartbeat({
      visible: true, lastInteractionAt: AGORA - 10_000, now: AGORA,
    })).toBe(true)
  })

  it('não conta com a aba escondida', () => {
    expect(shouldSendHeartbeat({
      visible: false, lastInteractionAt: AGORA, now: AGORA,
    })).toBe(false)
  })

  it('aba esquecida a noite toda: visível, mas sem ninguém ali', () => {
    // O caso do achado: visibilityState continua 'visible' com a janela atrás
    // de outra ou com a tela desligada. 8h sem interação não é permanência.
    expect(shouldSendHeartbeat({
      visible: true, lastInteractionAt: AGORA - 8 * 60 * MIN, now: AGORA,
    })).toBe(false)
  })

  it('a contagem volta sozinha quando o visitante volta a interagir', () => {
    expect(shouldSendHeartbeat({
      visible: true, lastInteractionAt: AGORA - HEARTBEAT_IDLE_TIMEOUT_MS - 1, now: AGORA,
    })).toBe(false)
    expect(shouldSendHeartbeat({
      visible: true, lastInteractionAt: AGORA, now: AGORA,
    })).toBe(true)
  })
})

describe('activeDwellSeconds', () => {
  it('leitura contínua conta inteira', () => {
    expect(activeDwellSeconds({
      now: AGORA,
      segmentStartedAt: AGORA - 2 * MIN,
      accumulatedMs: 0,
      lastInteractionAt: AGORA - 10_000,
    })).toBe(120)
  })

  it('aba aberta e esquecida a noite toda não vira 8 horas de leitura', () => {
    const dwell = activeDwellSeconds({
      now: AGORA,
      segmentStartedAt: AGORA - 8 * 60 * MIN,
      accumulatedMs: 0,
      lastInteractionAt: AGORA - 8 * 60 * MIN + 30_000, // 30s de leitura e sumiu
    })
    expect(dwell).toBe(30 + HEARTBEAT_IDLE_TIMEOUT_MS / 1000)
    expect(dwell).toBeLessThan(10 * 60)
  })

  it('somo os trechos anteriores e ignoro o tempo com a aba escondida', () => {
    // 3 min lidos antes de esconder a aba, 4h escondida, 1 min depois de voltar
    expect(activeDwellSeconds({
      now: AGORA,
      segmentStartedAt: AGORA - 1 * MIN, // trecho recomeçou ao voltar
      accumulatedMs: 3 * MIN,
      lastInteractionAt: AGORA - 30_000,
    })).toBe(240)
  })

  it('nunca fica negativo', () => {
    expect(activeDwellSeconds({
      now: AGORA,
      segmentStartedAt: AGORA + 5_000, // relógio do sistema recuou
      accumulatedMs: 0,
      lastInteractionAt: AGORA,
    })).toBe(0)
  })
})

describe('activeSegmentMs', () => {
  it('fecha o trecho no corte de ociosidade, não no relógio de parede', () => {
    expect(activeSegmentMs({
      now: AGORA,
      segmentStartedAt: AGORA - 60 * MIN,
      lastInteractionAt: AGORA - 59 * MIN,
    })).toBe(1 * MIN + HEARTBEAT_IDLE_TIMEOUT_MS)
  })
})
