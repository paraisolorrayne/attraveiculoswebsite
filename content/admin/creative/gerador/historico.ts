/**
 * Histórico local dos criativos gerados nas últimas 24 horas.
 *
 * Guarda o suficiente para REABRIR uma peça e mexer num detalhe: os campos, o
 * enquadramento de cada foto e as próprias fotos. Vive no navegador do
 * operador, não no servidor — é rascunho de trabalho, não acervo.
 *
 * POR QUE INDEXEDDB E NÃO localStorage. O localStorage guarda texto e tem teto
 * de ~5 MB. Uma foto de 1920×1440 tem ~600 KB, e uma peça usa até quatro; em
 * base64 elas ainda incham 33%. Duas peças já estourariam. O IndexedDB guarda
 * Blob direto, sem inflar, e o limite é ordens de grandeza maior.
 *
 * AS FOTOS SÃO GUARDADAS DE DUAS FORMAS, conforme a origem:
 *   estoque  -> só a URL (~200 bytes). Recarrega do proxy ao reabrir.
 *   arquivo  -> o Blob inteiro. É a única cópia que existe: veio do computador
 *               do operador e não está em lugar nenhum do nosso lado.
 */
import type { EstadoCriativo, FormatoId } from './tipos'

const BANCO = 'attra-gerador'
const LOJA = 'criativos'
const VERSAO = 1

/** 24 horas. Passado isso, o registro é descartado na próxima abertura. */
export const VALIDADE_MS = 24 * 60 * 60 * 1000

export type ChaveFoto = 'foto1' | 'foto2' | 'foto3' | 'foto4' | 'logo' | `est${0 | 1 | 2 | 3}`

/** De onde a foto veio — decide o que precisa ser guardado. */
export type FotoGuardada =
	| { origem: 'estoque'; url: string }
	| { origem: 'arquivo'; arquivo: Blob }

export interface CriativoGuardado {
	id: string
	/** Epoch em ms. */
	quando: number
	/** Como a peça aparece na lista: "MERCEDES-BENZ GLE 400D". */
	nome: string
	formato: FormatoId
	estado: EstadoCriativo
	fotos: Partial<Record<ChaveFoto, FotoGuardada>>
	/** JPEG pequeno do Stories, só para a lista. */
	miniatura: Blob
}

function abrir(): Promise<IDBDatabase> {
	return new Promise((ok, erro) => {
		const req = indexedDB.open(BANCO, VERSAO)
		req.onupgradeneeded = () => {
			const bd = req.result
			if (!bd.objectStoreNames.contains(LOJA)) {
				const loja = bd.createObjectStore(LOJA, { keyPath: 'id' })
				loja.createIndex('quando', 'quando')
			}
		}
		req.onsuccess = () => ok(req.result)
		req.onerror = () => erro(req.error ?? new Error('IndexedDB indisponível'))
	})
}

function transacao<T>(modo: IDBTransactionMode, fn: (loja: IDBObjectStore) => IDBRequest<T>): Promise<T> {
	return abrir().then(
		bd =>
			new Promise<T>((ok, erro) => {
				const t = bd.transaction(LOJA, modo)
				const req = fn(t.objectStore(LOJA))
				req.onsuccess = () => ok(req.result)
				req.onerror = () => erro(req.error ?? new Error('falha no IndexedDB'))
				t.oncomplete = () => bd.close()
			}),
	)
}

/**
 * Grava uma peça. Nunca lança: se o armazenamento estiver bloqueado (janela
 * anônima, cota cheia), o operador perde o histórico, não a peça que acabou de
 * baixar — e essa é a ordem certa das prioridades.
 */
export async function guardar(criativo: Omit<CriativoGuardado, 'id' | 'quando'>): Promise<string | null> {
	const registro: CriativoGuardado = {
		...criativo,
		id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		quando: Date.now(),
	}
	try {
		await transacao('readwrite', loja => loja.put(registro))
		return registro.id
	} catch (e) {
		console.warn('[gerador] não guardei no histórico:', e)
		return null
	}
}

/** Os criativos das últimas 24h, do mais recente para o mais antigo. */
export async function listar(): Promise<CriativoGuardado[]> {
	try {
		const todos = await transacao<CriativoGuardado[]>('readonly', loja => loja.getAll())
		const limite = Date.now() - VALIDADE_MS
		const vencidos = todos.filter(c => c.quando < limite)
		// A faxina é aqui, na leitura: não há processo de fundo no navegador, e
		// tentar apagar no momento exato do vencimento exigiria um timer vivo.
		if (vencidos.length) {
			await Promise.all(vencidos.map(c => remover(c.id)))
		}
		return todos.filter(c => c.quando >= limite).sort((a, b) => b.quando - a.quando)
	} catch (e) {
		console.warn('[gerador] não li o histórico:', e)
		return []
	}
}

export async function carregar(id: string): Promise<CriativoGuardado | null> {
	try {
		return (await transacao<CriativoGuardado | undefined>('readonly', loja => loja.get(id))) ?? null
	} catch {
		return null
	}
}

export async function remover(id: string): Promise<void> {
	try {
		await transacao('readwrite', loja => loja.delete(id))
	} catch (e) {
		console.warn('[gerador] não removi do histórico:', e)
	}
}

/** Miniatura do Stories para a lista: 216×384, JPEG. */
export function miniaturaDe(canvas: HTMLCanvasElement): Promise<Blob | null> {
	const L = 216
	const A = Math.round((L * canvas.height) / canvas.width)
	const pequeno = document.createElement('canvas')
	pequeno.width = L
	pequeno.height = A
	const ctx = pequeno.getContext('2d')
	if (!ctx) return Promise.resolve(null)
	ctx.imageSmoothingQuality = 'high'
	ctx.drawImage(canvas, 0, 0, L, A)
	return new Promise(ok => pequeno.toBlob(b => ok(b), 'image/jpeg', 0.72))
}
