import { NextRequest, NextResponse } from 'next/server'
import { chaveDeDuplicata, hojeBRT, lerPlanilha, MAXIMO_DE_LINHAS, type Celula, type LinhaLida } from '@/lib/boletos'
import { duplicatasNoBanco, importarBoletos } from '@/lib/boletos-db'
import { despacharAoFykos, exigirBoletos } from '../acesso'

export const dynamic = 'force-dynamic'

export interface LinhaDaPrevia extends LinhaLida {
  /** Já existe no banco ('banco') ou repete outra linha da mesma planilha ('planilha'). */
  duplicado: 'banco' | 'planilha' | null
}

/**
 * POST — lê a planilha e soma os boletos novos aos que já existem.
 *
 *   { celulas: (string | number | null)[][], confirmar?: boolean }
 *
 * Cada planilha AGREGA: o que já está cadastrado (mesmo telefone, vencimento
 * e valor) é pulado, o que é novo entra, e nada do que existia é mexido. O
 * navegador manda as células cruas (do .xlsx, do CSV ou do texto colado) e
 * quem interpreta é o servidor. A tela envia direto com `confirmar`; sem ele,
 * a rota só devolve a leitura, sem gravar (para conferir uma planilha antes).
 * As linhas boas entram todas ou nenhuma.
 */
export async function POST(request: NextRequest) {
  const acesso = await exigirBoletos()
  if (acesso instanceof NextResponse) return acesso
  const corpo = (await request.json().catch(() => null)) as { celulas?: unknown; confirmar?: unknown } | null
  if (!corpo || !Array.isArray(corpo.celulas)) return NextResponse.json({ error: 'Planilha não enviada.' }, { status: 400 })
  if (corpo.celulas.length > MAXIMO_DE_LINHAS + 50) {
    return NextResponse.json({ error: `A planilha passa de ${MAXIMO_DE_LINHAS} linhas. Divida em duas.` }, { status: 400 })
  }

  // Só texto, número e vazio entram: nada de objeto vindo do navegador.
  const celulas: Celula[][] = corpo.celulas.map(l =>
    Array.isArray(l)
      ? l.slice(0, 40).map(v => (typeof v === 'number' ? v : typeof v === 'string' ? v.slice(0, 600) : null))
      : [],
  )

  try {
    const planilha = lerPlanilha(celulas, hojeBRT())
    if (planilha.erro) return NextResponse.json({ error: planilha.erro, colunas: planilha.colunas }, { status: 422 })

    const boas = planilha.linhas.filter(l => l.erros.length === 0)
    const noBanco = await duplicatasNoBanco(boas)
    const vistas = new Set<string>()
    const linhas: LinhaDaPrevia[] = planilha.linhas.map(l => {
      if (l.erros.length > 0) return { ...l, duplicado: null }
      const chave = chaveDeDuplicata(l)
      const duplicado = noBanco.has(chave) ? 'banco' : vistas.has(chave) ? 'planilha' : null
      vistas.add(chave)
      return { ...l, duplicado }
    })
    const paraGravar = linhas.filter(l => l.erros.length === 0 && !l.duplicado)
    const resumo = {
      total: linhas.length,
      novos: paraGravar.length,
      comErro: linhas.filter(l => l.erros.length > 0).length,
      duplicados: linhas.filter(l => l.duplicado).length,
    }

    if (corpo.confirmar !== true) {
      return NextResponse.json({ linhas, resumo, colunas: planilha.colunas, comTitulos: planilha.comTitulos })
    }
    // Planilha sem nada novo não é erro: é só o caso em que tudo já estava lá.
    if (paraGravar.length === 0) return NextResponse.json({ criados: 0, lote_id: null, linhas, resumo, colunas: planilha.colunas, comTitulos: planilha.comTitulos })

    const { lote_id, criados } = await importarBoletos(
      paraGravar.map(l => ({ nome: l.nome, telefone: l.telefone, email: l.email, vencimento: l.vencimento, valor: l.valor, descricao: l.descricao })),
      acesso.autor,
    )
    despacharAoFykos()
    return NextResponse.json({ criados, lote_id, linhas, resumo, colunas: planilha.colunas, comTitulos: planilha.comTitulos }, { status: 201 })
  } catch (e) {
    console.error('[boletos] importar falhou:', e)
    return NextResponse.json({ error: 'Não foi possível importar a planilha. Nada foi gravado.' }, { status: 500 })
  }
}
