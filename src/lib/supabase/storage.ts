/**
 * Supabase Storage Service
 * Handles file uploads, downloads, and deletions using Supabase Storage
 */

import { createAdminClient } from './server'

// Storage bucket name for audio files
export const AUDIO_BUCKET = 'audio-files'

// Allowed audio MIME types
const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
]

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024

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

/**
 * Generate a unique filename for uploaded files
 */
function generateFilename(originalName: string): string {
  const ext = originalName.split('.').pop()?.toLowerCase() || 'mp3'
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `engine-sound-${timestamp}-${random}.${ext}`
}

/**
 * Validate audio file before upload
 */
function validateAudioFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Only MP3 and WAV files are allowed.',
    }
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 10MB.',
    }
  }

  return { valid: true }
}

/**
 * Upload an audio file to Supabase Storage
 */
export async function uploadAudioFile(file: File): Promise<UploadResult> {
  try {
    // Validate file
    const validation = validateAudioFile(file)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    const supabase = createAdminClient()
    const filename = generateFilename(file.name)
    const filePath = `sounds/${filename}`

    // Convert File to ArrayBuffer then to Uint8Array for Supabase
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(AUDIO_BUCKET)
      .upload(filePath, uint8Array, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Supabase upload error:', error)
      return { success: false, error: error.message }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(AUDIO_BUCKET)
      .getPublicUrl(filePath)

    return {
      success: true,
      url: urlData.publicUrl,
      path: data.path,
    }
  } catch (error) {
    console.error('Error uploading audio file:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Delete an audio file from Supabase Storage
 */
export async function deleteAudioFile(fileUrl: string): Promise<DeleteResult> {
  try {
    const supabase = createAdminClient()

    // Extract the path from the URL
    // URL format: https://xxx.supabase.co/storage/v1/object/public/audio-files/sounds/filename.mp3
    const urlParts = fileUrl.split(`/storage/v1/object/public/${AUDIO_BUCKET}/`)
    if (urlParts.length !== 2) {
      // Not a Supabase Storage URL, might be legacy local file
      console.warn('Not a Supabase Storage URL, skipping deletion:', fileUrl)
      return { success: true }
    }

    const filePath = urlParts[1]

    const { error } = await supabase.storage
      .from(AUDIO_BUCKET)
      .remove([filePath])

    if (error) {
      console.error('Supabase delete error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting audio file:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Check if a URL is a Supabase Storage URL
 */
export function isSupabaseStorageUrl(url: string): boolean {
  return url.includes('supabase.co/storage/v1/object/public/')
}

/**
 * Check if a URL is a legacy local upload URL
 */
export function isLegacyLocalUrl(url: string): boolean {
  return url.startsWith('/uploads/sounds/')
}

// =============================================
// BLOG IMAGE UPLOAD
// =============================================

export const BLOG_IMAGES_BUCKET = 'blog-images'

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
]

const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB

function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Tipo de arquivo inválido. Apenas JPEG, PNG, WebP e AVIF são permitidos.',
    }
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return {
      valid: false,
      error: 'Arquivo muito grande. Tamanho máximo é 5MB.',
    }
  }

  return { valid: true }
}

function generateImageFilename(originalName: string): string {
  const ext = originalName.split('.').pop()?.toLowerCase() || 'jpg'
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `blog-${timestamp}-${random}.${ext}`
}

/**
 * Upload a blog image to Supabase Storage
 */
export async function uploadBlogImage(file: File): Promise<UploadResult> {
  try {
    const validation = validateImageFile(file)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    const supabase = createAdminClient()
    const filename = generateImageFilename(file.name)
    const filePath = `posts/${filename}`

    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    const { data, error } = await supabase.storage
      .from(BLOG_IMAGES_BUCKET)
      .upload(filePath, uint8Array, {
        contentType: file.type,
        cacheControl: '31536000', // 1 year cache for images
        upsert: false,
      })

    if (error) {
      console.error('Supabase blog image upload error:', error)
      return { success: false, error: error.message }
    }

    const { data: urlData } = supabase.storage
      .from(BLOG_IMAGES_BUCKET)
      .getPublicUrl(filePath)

    return {
      success: true,
      url: urlData.publicUrl,
      path: data.path,
    }
  } catch (error) {
    console.error('Error uploading blog image:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// =============================================
// EXTERNAL IMAGE SNAPSHOT (link rot prevention)
// =============================================

const SNAPSHOT_FETCH_TIMEOUT_MS = 15_000
const SNAPSHOT_MAX_BYTES = 8 * 1024 * 1024
const SNAPSHOT_CONCURRENCY = 4

function isAlreadyInBucket(url: string, bucket: string): boolean {
  return url.includes(`/storage/v1/object/public/${bucket}/`)
}

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

/**
 * Download an external image and re-upload to Supabase Storage so blog posts
 * stop depending on third-party CDNs (link rot prevention).
 *
 * Returns the snapshotted URL on success, or the original URL on any failure
 * — callers should treat this as best-effort, not load-bearing.
 */
export async function snapshotExternalImage(externalUrl: string): Promise<string> {
  if (!externalUrl) return externalUrl
  if (isAlreadyInBucket(externalUrl, BLOG_IMAGES_BUCKET)) return externalUrl
  if (!/^https?:\/\//i.test(externalUrl)) return externalUrl

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), SNAPSHOT_FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(externalUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Attra-BlogSnapshot/1.0' },
    })
    if (!res.ok) {
      console.warn(`[snapshotImage] HTTP ${res.status} for ${externalUrl}`)
      return externalUrl
    }
    const contentType = res.headers.get('content-type')
    if (contentType && !contentType.startsWith('image/')) {
      console.warn(`[snapshotImage] non-image content-type ${contentType} for ${externalUrl}`)
      return externalUrl
    }
    const buf = await res.arrayBuffer()
    if (buf.byteLength > SNAPSHOT_MAX_BYTES) {
      console.warn(`[snapshotImage] too large (${buf.byteLength}b) for ${externalUrl}`)
      return externalUrl
    }

    const ext = extOfContentType(contentType, externalUrl)
    const filename = `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const filePath = `snapshots/${filename}`

    const supabase = createAdminClient()
    const { error } = await supabase.storage
      .from(BLOG_IMAGES_BUCKET)
      .upload(filePath, new Uint8Array(buf), {
        contentType: contentType ?? `image/${ext}`,
        cacheControl: '31536000',
        upsert: false,
      })
    if (error) {
      console.warn(`[snapshotImage] upload failed for ${externalUrl}: ${error.message}`)
      return externalUrl
    }

    const { data: urlData } = supabase.storage
      .from(BLOG_IMAGES_BUCKET)
      .getPublicUrl(filePath)
    return urlData.publicUrl
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[snapshotImage] error for ${externalUrl}: ${msg}`)
    return externalUrl
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Snapshot multiple external images in parallel (bounded concurrency).
 * Returns a map of original URL → snapshotted URL (or original if snapshot failed).
 */
export async function snapshotExternalImages(urls: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(urls.filter(Boolean))]
  const result: Record<string, string> = {}

  for (let i = 0; i < unique.length; i += SNAPSHOT_CONCURRENCY) {
    const batch = unique.slice(i, i + SNAPSHOT_CONCURRENCY)
    const settled = await Promise.all(batch.map(u => snapshotExternalImage(u)))
    batch.forEach((u, idx) => { result[u] = settled[idx] })
  }
  return result
}

/**
 * Delete a blog image from Supabase Storage
 */
export async function deleteBlogImage(fileUrl: string): Promise<DeleteResult> {
  try {
    const supabase = createAdminClient()

    const urlParts = fileUrl.split(`/storage/v1/object/public/${BLOG_IMAGES_BUCKET}/`)
    if (urlParts.length !== 2) {
      console.warn('Not a Supabase blog image URL, skipping deletion:', fileUrl)
      return { success: true }
    }

    const filePath = urlParts[1]

    const { error } = await supabase.storage
      .from(BLOG_IMAGES_BUCKET)
      .remove([filePath])

    if (error) {
      console.error('Supabase blog image delete error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting blog image:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

