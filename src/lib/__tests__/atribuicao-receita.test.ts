import { describe, expect, it } from 'vitest'
import {
  chaveTelefone,
  escolherSessaoDoCard,
  extrairRefSessao,
  ligarCardASessao,
  novoAgregado,
  origemCrmInfo,
  pareceUuid,
  perfisParaFallbackPorTelefone,
  somarCard,
  JANELA_ATRIBUICAO_DIAS,
  type EntradaLigacao,
} from '../atribuicao-receita'

describe('chaveTelefone', () => {
  it('reduz o número a DDD + 8 últimos dígitos', () => {
    expect(chaveTelefone('(11) 98765-4321')).toBe('1187654321')
  })

  it('casa o mesmo cliente com e sem o 9º dígito', () => {
    expect(chaveTelefone('11987654321')).toBe(chaveTelefone('1187654321'))
  })

  it('descarta o 55 de país só quando ele é prefixo de sobra', () => {
    expect(chaveTelefone('+55 (11) 98765-4321')).toBe('1187654321')
    // 55 aqui é o DDD de Santa Maria/RS — o número tem 11 dígitos e deve ficar intacto
    expect(chaveTelefone('55987654321')).toBe('5587654321')
  })

  it('recusa número sem DDD ou com lixo', () => {
    expect(chaveTelefone('987654321')).toBeNull()
    expect(chaveTelefone('')).toBeNull()
    expect(chaveTelefone(null)).toBeNull()
    expect(chaveTelefone('não tem telefone')).toBeNull()
    // Longo demais para ser um telefone brasileiro reconhecível
    expect(chaveTelefone('551198765432100')).toBeNull()
  })

  it('não confunde pessoas de DDDs diferentes com o mesmo número', () => {
    expect(chaveTelefone('11987654321')).not.toBe(chaveTelefone('21987654321'))
  })
})

describe('pareceUuid', () => {
  it('separa o id de sessão (uuid) do session_id do browser', () => {
    expect(pareceUuid('7c9e6679-7425-40de-944b-e07fc1f90ae7')).toBe(true)
    expect(pareceUuid('1721481234567-a1b2c3')).toBe(false)
  })
})

describe('extrairRefSessao', () => {
  it('acha o identificador nos campos nomeados', () => {
    expect(extrairRefSessao({ lead_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7' })).toEqual({
      valor: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      campo: 'lead_id',
    })
  })

  it('acha o marcador [ref: ...] embutido em texto livre', () => {
    const achado = extrairRefSessao({
      conversation_text: 'Vim do site e tenho interesse no Porsche 911 [ref: 1721481234567-a1b2c3]',
    })
    expect(achado).toEqual({ valor: '1721481234567-a1b2c3', campo: 'conversation_text [ref:]' })
  })

  it('acha o marcador dentro de um objeto de um nível', () => {
    expect(extrairRefSessao({ mensagem: { texto: 'oi [ref: abc-123]' } })?.valor).toBe('abc-123')
  })

  it('devolve null quando os extras não trazem nada de sessão', () => {
    expect(extrairRefSessao(null)).toBeNull()
    expect(extrairRefSessao({})).toBeNull()
    expect(extrairRefSessao({ resultado: 'encerrado_por_inatividade', vendedor: 'Ana' })).toBeNull()
  })

  it('ignora valor que não tem cara de identificador', () => {
    expect(extrairRefSessao({ ref: 'não sei' })).toBeNull()
  })
})

describe('escolherSessaoDoCard', () => {
  const criadoEm = new Date('2026-07-20T12:00:00Z')
  const dias = (n: number) => new Date(criadoEm.getTime() - n * 24 * 60 * 60 * 1000)

  it('escolhe a última sessão antes do card (último clique)', () => {
    const escolhida = escolherSessaoDoCard(
      [
        { id: 'antiga', started_at: dias(10) },
        { id: 'recente', started_at: dias(1) },
        { id: 'media', started_at: dias(4) },
      ],
      criadoEm,
    )
    expect(escolhida?.id).toBe('recente')
  })

  it('ignora sessão fora da janela de atribuição', () => {
    const fora = escolherSessaoDoCard(
      [{ id: 'velha', started_at: dias(JANELA_ATRIBUICAO_DIAS + 1) }],
      criadoEm,
    )
    expect(fora).toBeNull()
  })

  it('aceita sessão poucas horas depois do card (folga do relógio do CRM)', () => {
    const depois = new Date(criadoEm.getTime() + 2 * 60 * 60 * 1000)
    expect(escolherSessaoDoCard([{ id: 'logo-depois', started_at: depois }], criadoEm)?.id).toBe(
      'logo-depois',
    )
  })

  it('recusa sessão muito depois do card', () => {
    const bemDepois = new Date(criadoEm.getTime() + 5 * 24 * 60 * 60 * 1000)
    expect(escolherSessaoDoCard([{ id: 'tarde', started_at: bemDepois }], criadoEm)).toBeNull()
  })

  it('devolve null sem sessão nenhuma', () => {
    expect(escolherSessaoDoCard([], criadoEm)).toBeNull()
  })
})

describe('perfisParaFallbackPorTelefone', () => {
  const chavesTelefonePorCard = new Map([
    ['card-forte-ok', '1187654321'],
    ['card-candidato-que-nao-casou', '2199887766'],
    ['card-so-telefone', '3133224455'],
  ])
  const perfisPorTelefone = new Map([
    ['1187654321', ['perfil-a']],
    ['2199887766', ['perfil-b', 'perfil-b2']],
    ['3133224455', ['perfil-c']],
  ])

  it('dispensa o telefone só do card cuja chave forte resolveu numa sessão', () => {
    const alvo = perfisParaFallbackPorTelefone({
      chavesTelefonePorCard,
      // Apenas este card casou de verdade. Os outros dois seguem precisando do telefone —
      // inclusive o que trazia `lead_id` com o id interno do CRM.
      cardsComChaveForteResolvida: new Set(['card-forte-ok']),
      perfisPorTelefone,
    })
    expect([...alvo].sort()).toEqual(['perfil-b', 'perfil-b2', 'perfil-c'])
  })

  it('não perde nenhum perfil quando nenhuma chave forte resolveu', () => {
    const alvo = perfisParaFallbackPorTelefone({
      chavesTelefonePorCard,
      cardsComChaveForteResolvida: new Set<string>(),
      perfisPorTelefone,
    })
    expect(alvo.size).toBe(4)
  })

  it('ignora telefone que não existe em nenhum perfil', () => {
    const alvo = perfisParaFallbackPorTelefone({
      chavesTelefonePorCard: new Map([['card-x', '4199999999']]),
      cardsComChaveForteResolvida: new Set<string>(),
      perfisPorTelefone,
    })
    expect(alvo.size).toBe(0)
  })
})

describe('ligarCardASessao', () => {
  const criadoEm = new Date('2026-07-20T12:00:00Z')
  const dias = (n: number) => new Date(criadoEm.getTime() - n * 24 * 60 * 60 * 1000)
  const sessao = (id: string, n: number) => ({ id, started_at: dias(n) })

  type Sessao = { id: string; started_at: Date }
  const base: EntradaLigacao<Sessao> = {
    sessaoChaveForte: null,
    temTelefone: false,
    telefoneTemPerfil: false,
    sessoesDoTelefone: [],
    criadoEm,
  }

  it('usa a chave forte quando ela resolveu numa sessão de verdade', () => {
    const r = ligarCardASessao({
      ...base,
      sessaoChaveForte: sessao('da-chave', 3),
      temTelefone: true,
      telefoneTemPerfil: true,
      sessoesDoTelefone: [sessao('do-telefone', 1)],
    })
    expect(r).toMatchObject({ metodo: 'chave_forte', motivo: null })
    expect(r.sessao?.id).toBe('da-chave')
  })

  // O caso que a revisão pegou: o CRM manda o id INTERNO dele em `lead_id`. O card passa a "ter
  // candidato", mas o candidato não existe em visitor_sessions. Se isso descartar o telefone, a
  // ligação some da base inteira em silêncio.
  it('cai no telefone quando o identificador do card é de outro sistema e não resolveu', () => {
    const r = ligarCardASessao({
      ...base,
      sessaoChaveForte: null, // "CRM-INTERNAL-999" não casou com nenhuma sessão
      temTelefone: true,
      telefoneTemPerfil: true,
      sessoesDoTelefone: [sessao('visita-2-dias-antes', 2)],
    })
    expect(r).toMatchObject({ metodo: 'telefone', motivo: null })
    expect(r.sessao?.id).toBe('visita-2-dias-antes')
  })

  it('não rotula como "sem visita na janela" o card que nem telefone tinha', () => {
    const r = ligarCardASessao({ ...base, temTelefone: false })
    expect(r).toEqual({ sessao: null, metodo: null, motivo: 'sem_telefone' })
  })

  it('separa telefone que nunca se identificou no site de telefone sem visita na janela', () => {
    expect(
      ligarCardASessao({ ...base, temTelefone: true, telefoneTemPerfil: false }).motivo,
    ).toBe('telefone_sem_perfil')

    expect(
      ligarCardASessao({
        ...base,
        temTelefone: true,
        telefoneTemPerfil: true,
        sessoesDoTelefone: [sessao('velha', JANELA_ATRIBUICAO_DIAS + 5)],
      }).motivo,
    ).toBe('telefone_sem_sessao')

    expect(
      ligarCardASessao({ ...base, temTelefone: true, telefoneTemPerfil: true, sessoesDoTelefone: [] })
        .motivo,
    ).toBe('telefone_sem_sessao')
  })

  it('classifica cada card em exatamente um balde, e os baldes somam o total', () => {
    const entradas: EntradaLigacao<Sessao>[] = [
      { ...base, sessaoChaveForte: sessao('forte', 1) },
      { ...base, temTelefone: true, telefoneTemPerfil: true, sessoesDoTelefone: [sessao('tel', 2)] },
      // Candidato que não resolveu + telefone com perfil e visita: tem de contar como ligado.
      { ...base, temTelefone: true, telefoneTemPerfil: true, sessoesDoTelefone: [sessao('tel2', 9)] },
      { ...base },
      { ...base, temTelefone: true, telefoneTemPerfil: false },
      {
        ...base,
        temTelefone: true,
        telefoneTemPerfil: true,
        sessoesDoTelefone: [sessao('fora', JANELA_ATRIBUICAO_DIAS + 1)],
      },
    ]

    const baldes = {
      chave_forte: 0,
      telefone: 0,
      sem_telefone: 0,
      telefone_sem_perfil: 0,
      telefone_sem_sessao: 0,
    }

    for (const entrada of entradas) {
      const r = ligarCardASessao(entrada)
      // Ligado tem método e nenhum motivo; não ligado tem motivo e nenhum método.
      expect(Boolean(r.metodo) !== Boolean(r.motivo)).toBe(true)
      expect(Boolean(r.sessao)).toBe(Boolean(r.metodo))
      baldes[r.metodo ?? r.motivo!] += 1
    }

    expect(baldes).toEqual({
      chave_forte: 1,
      telefone: 2,
      sem_telefone: 1,
      telefone_sem_perfil: 1,
      telefone_sem_sessao: 1,
    })
    const soma = Object.values(baldes).reduce((a, b) => a + b, 0)
    expect(soma).toBe(entradas.length)
  })
})

describe('somarCard', () => {
  it('só conta receita de venda fechada', () => {
    const a = novoAgregado()
    somarCard(a, { etapa: 'encerrado_ganho', valor: 250000 })
    somarCard(a, { etapa: 'encerrado_perdido', valor: 900000 })
    somarCard(a, { etapa: 'em_negociacao', valor: 400000 })
    expect(a).toMatchObject({ cards: 3, ganhos: 1, perdidos: 1, abertos: 1, receita: 250000 })
  })

  it('marca a venda fechada que chegou sem valor em vez de somar zero calado', () => {
    const a = novoAgregado()
    somarCard(a, { etapa: 'encerrado_ganho', valor: null })
    somarCard(a, { etapa: 'encerrado_ganho', valor: 0 })
    expect(a).toMatchObject({ ganhos: 2, receita: 0, ganhos_sem_valor: 2 })
  })
})

describe('origemCrmInfo', () => {
  it('explica o vocabulário do CRM sem traduzi-lo para canal do site', () => {
    expect(origemCrmInfo('patrocinado').leitura).toMatch(/não diz qual plataforma/i)
  })

  it('não inventa leitura para valor novo', () => {
    expect(origemCrmInfo('indicacao')).toEqual({
      rotulo: 'indicacao',
      leitura: 'Valor novo, ainda sem leitura definida com o time comercial.',
    })
  })
})
