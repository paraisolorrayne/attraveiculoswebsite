/**
 * Rate Limiting Utility
 * 
 * Simple in-memory rate limiter for API routes.
 * Works correctly in single-instance PM2 (fork mode). If the app scales to
 * PM2 cluster mode or multiple containers, each process will have its own
 * Map — effectively multiplying the allowed rate by the number of instances.
 * In that scenario, migrate to a shared store such as Redis or Upstash.
 */

export interface RateLimitConfig {
  /** Maximum number of requests allowed */
  limit: number
  /** Time window in milliseconds */
  windowMs: number
  /** Optional identifier prefix for the rate limit key */
  prefix?: string
}

interface RateLimitRecord {
  count: number
  resetTime: number
}

// In-memory store for rate limit records
const rateLimitStore = new Map<string, RateLimitRecord>()

// Cleanup old records periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanupExpiredRecords(): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  
  lastCleanup = now
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
}

/**
 * Check rate limit for a given identifier
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanupExpiredRecords()
  
  const key = config.prefix ? `${config.prefix}:${identifier}` : identifier
  const now = Date.now()
  const record = rateLimitStore.get(key)
  
  // No existing record or expired - create new one
  if (!record || now > record.resetTime) {
    const resetTime = now + config.windowMs
    rateLimitStore.set(key, { count: 1, resetTime })
    return {
      success: true,
      remaining: config.limit - 1,
      resetTime,
    }
  }
  
  // Check if limit exceeded
  if (record.count >= config.limit) {
    return {
      success: false,
      remaining: 0,
      resetTime: record.resetTime,
      retryAfter: Math.ceil((record.resetTime - now) / 1000),
    }
  }
  
  // Increment counter
  record.count++
  return {
    success: true,
    remaining: config.limit - record.count,
    resetTime: record.resetTime,
  }
}

/**
 * Get client IP address from request headers
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }
  
  // Fallback - use a hash of user agent + accept-language for basic uniqueness
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const acceptLang = request.headers.get('accept-language') || 'unknown'
  return `anon:${hashString(userAgent + acceptLang)}`
}

function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

// Preset configurations for different route types
export const RATE_LIMIT_PRESETS = {
  // Very strict for authentication routes
  auth: {
    limit: 5,
    windowMs: 15 * 60 * 1000, // 5 attempts per 15 minutes
    prefix: 'auth',
  },
  // Strict for form submissions
  form: {
    limit: 10,
    windowMs: 60 * 1000, // 10 per minute
    prefix: 'form',
  },
  // Moderate for API calls
  api: {
    limit: 60,
    windowMs: 60 * 1000, // 60 per minute
    prefix: 'api',
  },
  // Relaxed for read-only endpoints
  read: {
    limit: 120,
    windowMs: 60 * 1000, // 120 per minute
    prefix: 'read',
  },
  // Very strict for AI/expensive operations
  expensive: {
    limit: 10,
    windowMs: 60 * 1000, // 10 per minute
    prefix: 'expensive',
  },
} as const

