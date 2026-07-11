import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

// Security logging helper
function logSecurityEvent(
  event: string,
  request: NextRequest,
  details?: Record<string, unknown>
) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const timestamp = new Date().toISOString()

  console.log(JSON.stringify({
    type: 'security_event',
    event,
    timestamp,
    ip,
    userAgent: userAgent.substring(0, 100), // Truncate long user agents
    path: request.nextUrl.pathname,
    method: request.method,
    ...details,
  }))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect admin routes (except login and reset-password)
  if (!pathname.startsWith('/admin') ||
    pathname === '/admin/login' ||
    pathname.startsWith('/admin/reset-password')) {
    return NextResponse.next()
  }

  // TEMPORARY BYPASS: Permitir acesso livre ao admin
  if (pathname === '/admin') {
    return NextResponse.redirect(new URL('/admin/engine-sounds', request.url))
  }
  return NextResponse.next()

  /*
  // DEV BYPASS: Skip auth on localhost for local testing
  if (process.env.NODE_ENV === 'development') {
    const host = request.headers.get('host') || ''
    if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
      return NextResponse.next()
    }
  }

  // Security check: Validate request origin for admin routes
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  const referer = request.headers.get('referer')

  // Log access attempts to admin routes
  logSecurityEvent('admin_access_attempt', request, {
    origin,
    referer: referer?.substring(0, 200), // Truncate long referers
  })

  // Block requests with suspicious origins (if origin is set and doesn't match host)
  if (origin && host) {
    try {
      const originHost = new URL(origin).host
      if (originHost !== host) {
        logSecurityEvent('suspicious_origin_blocked', request, { origin, host })
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }
    } catch {
      // Invalid origin URL, continue
    }
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Client for auth session management (uses anon key)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Get current session
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (!user) {
    // Log unauthenticated access attempt
    logSecurityEvent('admin_unauthenticated', request)

    // Redirect to login if not authenticated
    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Admin client to bypass RLS for checking admin_users table
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  // Check if user has admin access
  const { data: adminUser, error: adminError } = await adminClient
    .from('admin_users')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (!adminUser || !adminUser.is_active) {
    // Log unauthorized access attempt
    logSecurityEvent('admin_unauthorized', request, {
      userId: user.id,
      reason: !adminUser ? 'not_admin' : 'inactive',
    })

    // User is authenticated but not an admin - redirect to login
    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('error', 'unauthorized')
    return NextResponse.redirect(loginUrl)
  }

  // Role-based access control
  const role = adminUser.role as 'admin' | 'gerente'

  // Log successful admin access
  logSecurityEvent('admin_access_granted', request, {
    userId: user.id,
    role,
  })

  // Admins have full access
  if (role === 'admin') {
    return response
  }

  // Gerente can only access /admin/engine-sounds
  if (role === 'gerente') {
    if (pathname.startsWith('/admin/engine-sounds')) {
      return response
    }

    // Log role-based restriction
    logSecurityEvent('admin_role_restricted', request, {
      userId: user.id,
      role,
      attemptedPath: pathname,
    })

    // Redirect gerente to their allowed page
    return NextResponse.redirect(new URL('/admin/engine-sounds', request.url))
  }

  // Unknown role - deny access
  logSecurityEvent('admin_unknown_role', request, {
    userId: user.id,
    role,
  })
  return NextResponse.redirect(new URL('/admin/login', request.url))
  */
}

export const config = {
  matcher: [
    '/admin/:path*',
  ],
}

