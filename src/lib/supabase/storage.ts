/**
 * Storage Service — agora em DISCO + Nginx (Fase 6), não mais Supabase Storage.
 * Ver src/lib/storage/disk.ts e docs/MIGRACAO_POSTGRES_PURO.md.
 *
 * O nome/caminho do arquivo é mantido pra não quebrar os ~6 imports existentes.
 * Interface preservada (uploadAudioFile, uploadBlogImage, snapshot*, delete*).
 */

import { putObject, deleteObject, objectPathFromUrl, isManagedStorageUrl, isInBucket } from '@/lib/storage/disk'

// Buckets = subpastas em MEDIA_ROOT
export const AUDIO_BUCKET = 'audio-files'
export const BLOG_IMAGES_BUCKET = 'blog-images'

const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export interface UploadResult {
  success: boolean
  url?: string
  path?: string
  error?: string
}

export interface DeleteResult {
  success: boolean
  error?: string
}

function generateFilename(originalName: string): string {
  const ext = originalName.split('.').pop()?.toLowerCase() || 'mp3'
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `engine-sound-${timestamp}-${random}.${ext}`
}

function validateAudioFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Only MP3 and WAV files are allowed.' }
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File too large. Maximum size is 10MB.' }
  }
  return { valid: true }
}

/** Upload de áudio (som de motor) pro disco. */
export async function uploadAudioFile(file: File): Promise<UploadResult> {
  try {
    const validation = validateAudioFile(file)
    if (!validation.valid) return { success: false, error: validation.error }

    const filePath = `sounds/${generateFilename(file.name)}`
    const bytes = new Uint8Array(await file.arrayBuffer())
    const url = await putObject(AUDIO_BUCKET, filePath, bytes)

    return { success: true, url, path: filePath }
  } catch (error) {
    console.error('Error uploading audio file:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/** Remove um áudio. Aceita URL legada (Supabase) e a nova (disco). */
export async function deleteAudioFile(fileUrl: string): Promise<DeleteResult> {
  try {
    const objectPath = objectPathFromUrl(fileUrl, AUDIO_BUCKET)
    if (!objectPath) {
      console.warn('Not a managed storage URL, skipping deletion:', fileUrl)
      return { success: true }
    }
    await deleteObject(AUDIO_BUCKET, objectPath)
    return { success: true }
  } catch (error) {
    console.error('Error deleting audio file:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/** URL gerenciada por nós (Supabase legado OU disco). Nome mantido por compat. */
export function isSupabaseStorageUrl(url: string): boolean {
  return isManagedStorageUrl(url)
}

export function isLegacyLocalUrl(url: string): boolean {
  return url.startsWith('/uploads/sounds/')
}

// ============================= BLOG IMAGE =============================

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif']
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB

function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: 'Tipo de arquivo inválido. Apenas JPEG, PNG, WebP e AVIF são permitidos.' }
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return { valid: false, error: 'Arquivo muito grande. Tamanho máximo é 5MB.' }
  }
  return { valid: true }
}

function generateImageFilename(originalName: string): string {
  const ext = originalName.split('.').pop()?.toLowerCase() || 'jpg'
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `blog-${timestamp}-${random}.${ext}`
}

/** Upload de imagem de blog pro disco. */
export async function uploadBlogImage(file: File): Promise<UploadResult> {
  try {
    const validation = validateImageFile(file)
    if (!validation.valid) return { success: false, error: validation.error }

    const filePath = `posts/${generateImageFilename(file.name)}`
    const bytes = new Uint8Array(await file.arrayBuffer())
    const url = await putObject(BLOG_IMAGES_BUCKET, filePath, bytes)

    return { success: true, url, path: filePath }
  } catch (error) {
    console.error('Error uploading blog image:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// =============== EXTERNAL IMAGE SNAPSHOT (link rot prevention) ===============

const SNAPSHOT_FETCH_TIMEOUT_MS = 15_000
const SNAPSHOT_MAX_BYTES = 8 * 1024 * 1024
const SNAPSHOT_CONCURRENCY = 4
const SNAPSHOT_MAX_ATTEMPTS = 2
const SNAPSHOT_RETRY_DELAY_MS = 800

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function extOfContentType(contentType: string | null, fallbackUrl: string): string {
  if (contentType) {
    if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg'
    if (contentType.includes('png')) return 'png'
    if (contentType.includes('webp')) return 'webp'
    if (contentType.includes('avif')) return 'avif'
  }
  const m = fallbackUrl.match(/\.(jpe?g|png|webp|avif)(?:$|\?)/i)
  return (m?.[1] ?? 'jpg').toLowerCase().replace('jpeg', 'jpg')
}

/** Uma tentativa: baixa + grava no disco. null = falha retriável; throw = permanente. */
async function snapshotAttempt(externalUrl: string): Promise<string | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), SNAPSHOT_FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(externalUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Attra-BlogSnapshot/1.0' },
    })
    if (!res.ok) {
      if (res.status >= 500) return null
      throw new Error(`HTTP ${res.status}`)
    }
    const contentType = res.headers.get('content-type')
    if (contentType && !contentType.startsWith('image/')) {
      throw new Error(`non-image content-type ${contentType}`)
    }
    const buf = await res.arrayBuffer()
    if (buf.byteLength > SNAPSHOT_MAX_BYTES) {
      throw new Error(`too large (${buf.byteLength}b)`)
    }

    const ext = extOfContentType(contentType, externalUrl)
    const filePath = `snapshots/snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    try {
      return await putObject(BLOG_IMAGES_BUCKET, filePath, new Uint8Array(buf))
    } catch {
      return null // erro de escrita — retriável
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Baixa uma imagem externa e re-hospeda no nosso storage (evita link rot).
 * Best-effort com 1 retry; devolve a URL original em falha permanente.
 */
export async function snapshotExternalImage(externalUrl: string): Promise<string> {
  if (!externalUrl) return externalUrl
  if (isInBucket(externalUrl, BLOG_IMAGES_BUCKET)) return externalUrl
  if (!/^https?:\/\//i.test(externalUrl)) return externalUrl

  for (let attempt = 1; attempt <= SNAPSHOT_MAX_ATTEMPTS; attempt++) {
    try {
      const url = await snapshotAttempt(externalUrl)
      if (url) return url
      if (attempt < SNAPSHOT_MAX_ATTEMPTS) {
        await sleep(SNAPSHOT_RETRY_DELAY_MS * attempt)
        continue
      }
      console.warn(`[snapshotImage] giving up after ${attempt} attempts for ${externalUrl}`)
      return externalUrl
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`[snapshotImage] permanent failure for ${externalUrl}: ${msg}`)
      return externalUrl
    }
  }
  return externalUrl
}

/** Snapshot de várias imagens (concorrência limitada). */
export async function snapshotExternalImages(urls: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(urls.filter(Boolean))]
  const result: Record<string, string> = {}

  for (let i = 0; i < unique.length; i += SNAPSHOT_CONCURRENCY) {
    const batch = unique.slice(i, i + SNAPSHOT_CONCURRENCY)
    const settled = await Promise.all(batch.map((u) => snapshotExternalImage(u)))
    batch.forEach((u, idx) => { result[u] = settled[idx] })
  }
  return result
}

/** Remove uma imagem de blog. Aceita URL legada (Supabase) e a nova (disco). */
export async function deleteBlogImage(fileUrl: string): Promise<DeleteResult> {
  try {
    const objectPath = objectPathFromUrl(fileUrl, BLOG_IMAGES_BUCKET)
    if (!objectPath) {
      console.warn('Not a managed blog image URL, skipping deletion:', fileUrl)
      return { success: true }
    }
    await deleteObject(BLOG_IMAGES_BUCKET, objectPath)
    return { success: true }
  } catch (error) {
    console.error('Error deleting blog image:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
