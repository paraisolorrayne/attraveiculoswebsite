import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIP, RATE_LIMIT_PRESETS } from '@/lib/rate-limit'
import { signInWithEmail } from '@/lib/admin-auth-supabase'

// Migrado do Supabase GoTrue → Auth.js (ver docs/MIGRACAO_POSTGRES_PURO.md).
// O signIn do Auth.js (Credentials) seta o cookie de sessão internamente.
export async function POST(request: NextRequest) {
  try {
    // Rate limiting - very strict for login attempts
    const clientIP = getClientIP(request)
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_PRESETS.auth)

    if (!rateLimitResult.success) {
      console.warn(`[Admin Login] Rate limit exceeded for IP: ${clientIP}`)
      return NextResponse.json(
        {
          error: 'Muitas tentativas de login. Tente novamente mais tarde.',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter),
            'X-RateLimit-Limit': String(RATE_LIMIT_PRESETS.auth.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimitResult.resetTime),
          },
        }
      )
    }

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 })
    }

    const result = await signInWithEmail(email, password)
    if (!result.success || !result.user) {
      return NextResponse.json({ error: result.error || 'Credenciais inválidas' }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      user: { id: result.user.id, email: result.user.email, role: result.user.role },
    })
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
