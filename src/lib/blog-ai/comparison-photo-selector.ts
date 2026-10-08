import sharp from 'sharp'
import { GEMINI_TEXT_MODEL } from '@/lib/gemini-config'

const LIMIT = 5

type Escolha = { a?: number; b?: number; confiancaA?: number; confiancaB?: number }

async function miniatura(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15_000) })
    if (!r.ok) return null
    return (await sharp(Buffer.from(await r.arrayBuffer())).rotate().resize(640, 480, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 70 }).toBuffer()).toString('base64')
  } catch { return null }
}

/** Escolhe só entre as cinco primeiras fotos; nunca altera a foto selecionada. */
export async function selecionarFotosFrontais(a: string[], b: string[]): Promise<[string | undefined, string | undefined]> {
  const aa = a.slice(0, LIMIT), bb = b.slice(0, LIMIT)
  const key = process.env.GEMINI_API_KEY
  if (!key || !aa.length || !bb.length) return [aa[0], bb[0]]
  const itens = await Promise.all([...aa.map(async (url, i) => ['A', i, await miniatura(url)] as const), ...bb.map(async (url, i) => ['B', i, await miniatura(url)] as const)])
  const parts: Array<Record<string, unknown>> = [{ text: 'Escolha a melhor foto FRONTAL de cada veículo. Priorize grade, faróis e frente visíveis; ignore estética. Responda APENAS JSON: {"a":indice,"b":indice,"confiancaA":0-1,"confiancaB":0-1}. Use -1 se não houver foto frontal clara.' }]
  for (const [carro, indice, data] of itens) if (data) {
    parts.push({ text: `Veículo ${carro}, foto ${indice}` })
    parts.push({ inlineData: { mimeType: 'image/jpeg', data } })
  }
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0, maxOutputTokens: 100, responseMimeType: 'application/json' } }), signal: AbortSignal.timeout(30_000) })
    const text = (await r.json()).candidates?.[0]?.content?.parts?.[0]?.text
    const e = JSON.parse(text ?? '{}') as Escolha
    const indice = (valor: number | undefined, confianca: number | undefined, fotos: string[]) => typeof valor === 'number' && valor >= 0 && valor < fotos.length && (confianca ?? 0) >= .65 ? fotos[valor] : fotos[0]
    return [indice(e.a, e.confiancaA, aa), indice(e.b, e.confiancaB, bb)]
  } catch { return [aa[0], bb[0]] }
}
