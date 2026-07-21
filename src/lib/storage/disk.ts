/**
 * Storage em DISCO (Fase 6 da migração — substitui o Supabase Storage).
 * Ver docs/MIGRACAO_POSTGRES_PURO.md.
 *
 * Arquivos gravados em `${MEDIA_ROOT}/<bucket>/<path>` na VPS e servidos como
 * estáticos pelo Nginx sob `MEDIA_PUBLIC_URL`. Sem serviço externo.
 *
 * Env:
 *   MEDIA_ROOT        (default /var/www/attra-media)  — base no filesystem
 *   MEDIA_PUBLIC_URL  (default https://attraveiculos.com.br/media) — base pública
 *
 * OPS (VPS): criar o dir, dar permissão ao user do PM2, e um location no Nginx:
 *   location /media/ { alias /var/www/attra-media/; access_log off; expires 30d; }
 */
import { promises as fs } from 'fs'
import path from 'path'

const MEDIA_ROOT = process.env.MEDIA_ROOT || '/var/www/attra-media'
export const MEDIA_PUBLIC_URL = (process.env.MEDIA_PUBLIC_URL || 'https://attraveiculos.com.br/media').replace(/\/$/, '')

/** Rejeita path traversal — objectPath vem de nomes gerados OU de URLs. */
function safeObjectPath(objectPath: string): string {
  const clean = objectPath.replace(/^\/+/, '')
  if (clean.split('/').some((seg) => seg === '..' || seg === '')) {
    throw new Error(`objectPath inválido: ${objectPath}`)
  }
  return clean
}

export function publicUrl(bucket: string, objectPath: string): string {
  return `${MEDIA_PUBLIC_URL}/${bucket}/${safeObjectPath(objectPath)}`
}

/** Grava os bytes e devolve a URL pública. */
export async function putObject(
  bucket: string,
  objectPath: string,
  bytes: Uint8Array | Buffer,
): Promise<string> {
  const rel = safeObjectPath(objectPath)
  const full = path.join(MEDIA_ROOT, bucket, rel)
  await fs.mkdir(path.dirname(full), { recursive: true })
  await fs.writeFile(full, bytes)
  return publicUrl(bucket, rel)
}

/** Remove o arquivo (idempotente). */
export async function deleteObject(bucket: string, objectPath: string): Promise<void> {
  const rel = safeObjectPath(objectPath)
  const full = path.join(MEDIA_ROOT, bucket, rel)
  await fs.rm(full, { force: true })
}

/**
 * Extrai o objectPath de uma URL pública. Aceita o formato NOVO (disco/Nginx)
 * e o LEGADO do Supabase (durante a transição, antes de reescrever as URLs no banco).
 */
export function objectPathFromUrl(url: string, bucket: string): string | null {
  const supa = url.split(`/storage/v1/object/public/${bucket}/`)
  if (supa.length === 2) return supa[1]
  const marker = `/${bucket}/`
  const idx = url.indexOf(marker)
  if (url.startsWith(MEDIA_PUBLIC_URL) && idx !== -1) {
    return url.slice(idx + marker.length)
  }
  return null
}

/** URL gerenciada por nós (Supabase legado OU disco novo)? */
export function isManagedStorageUrl(url: string): boolean {
  return url.includes('/storage/v1/object/public/') || url.startsWith(MEDIA_PUBLIC_URL)
}

/** A URL já aponta pro nosso storage neste bucket? (pula re-snapshot) */
export function isInBucket(url: string, bucket: string): boolean {
  return url.includes(`/storage/v1/object/public/${bucket}/`) ||
    url.startsWith(`${MEDIA_PUBLIC_URL}/${bucket}/`)
}
