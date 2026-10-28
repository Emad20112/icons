import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getHeader, getCookie } from 'h3'
import type { H3Event } from 'h3'
import { dbStore } from './mockStore'
import type { Profile, UserRole } from '../../types/database'

let cachedAdminClient: SupabaseClient | null = null
let cachedAnonClient: SupabaseClient | null = null

function getConfig() {
  let url = process.env.NUXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
  let anonKey = process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || ''
  let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || ''

  try {
    // If running within Nuxt Nitro runtime
    // @ts-ignore
    if (typeof useRuntimeConfig === 'function') {
      // @ts-ignore
      const config = useRuntimeConfig()
      url = config.public?.supabaseUrl || url
      anonKey = config.public?.supabaseAnonKey || anonKey
      serviceKey = config.supabaseServiceRoleKey || serviceKey
    }
  } catch {
    // In standalone Vitest or test runner
  }

  return { url, anonKey, serviceKey }
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getConfig()
  return Boolean(
    url && 
    anonKey && 
    !url.includes('mock-project') && 
    !url.includes('mock-ci') && 
    !anonKey.includes('anon-token') &&
    !anonKey.includes('ci-anon')
  )
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null

  if (!cachedAdminClient) {
    const { url, serviceKey } = getConfig()

    if (!serviceKey) {
      console.warn('SUPABASE_SERVICE_ROLE_KEY is not defined. Admin operations restricted.')
      return null
    }

    cachedAdminClient = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }

  return cachedAdminClient
}

export function getSupabaseAnonClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null

  if (!cachedAnonClient) {
    const { url, anonKey } = getConfig()
    cachedAnonClient = createClient(url, anonKey)
  }

  return cachedAnonClient
}

export interface AuthContext {
  user: Profile | null
  role: UserRole | null
  userId: string | null
}

/**
 * Anonymous / unauthenticated context. Callers MUST treat a null role as
 * "no privileges" and must never fall back to an elevated role.
 */
function anonymousContext(): AuthContext {
  return { user: null, role: null, userId: null }
}

/**
 * Whether the local dev impersonation surface is enabled.
 *
 * The local mock store has no password verification, so allowing the client to
 * pick an identity is equivalent to letting anyone become an ADMIN. That is only
 * acceptable in development. The flag must be an explicit opt-in and is ignored
 * whenever NODE_ENV === 'production'.
 */
export function isDevImpersonationEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') return false
  return process.env.NUXT_DEV_ALLOW_IMPERSONATION === 'true'
}

function safeGetHeader(event: H3Event, name: string): string | undefined {
  if (!event) return undefined
  const lower = name.toLowerCase()
  const evAny = event as any
  if (evAny.node?.req?.headers) {
    const val = evAny.node.req.headers[lower] ?? evAny.node.req.headers[name]
    if (val !== undefined) return val
  }
  if (evAny.req?.headers) {
    if (typeof evAny.req.headers.get === 'function') {
      const val = evAny.req.headers.get(name)
      if (val !== undefined && val !== null) return val
    }
    const val = evAny.req.headers[lower] ?? evAny.req.headers[name]
    if (val !== undefined) return val
  }
  try {
    return getHeader(event, name)
  } catch {
    return undefined
  }
}

function safeGetCookie(event: H3Event, name: string): string | undefined {
  if (!event) return undefined
  try {
    const val = getCookie(event, name)
    if (val !== undefined) return val
  } catch {
    // fall through
  }
  const cookieHeader = safeGetHeader(event, 'cookie')
  if (cookieHeader) {
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
    if (match) return decodeURIComponent(match[1])
  }
  return undefined
}

/**
 * Resolves the current authenticated identity from the request.
 *
 * Trust order:
 *   1. Verified Supabase bearer token (authoritative).
 *   2. Signed-in session cookie holding the user id.
 *   3. Dev-only impersonation, gated behind isDevImpersonationEnabled().
 *
 * The request is NEVER allowed to assert its own role via headers: a client
 * supplied role would be an unauthenticated privilege escalation.
 */
export async function getAuthContext(event: H3Event): Promise<AuthContext> {
  const authHeader = safeGetHeader(event, 'authorization')

  // 1. If real Supabase is configured and a bearer token is present
  if (isSupabaseConfigured() && authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const admin = getSupabaseAdminClient()
    if (admin) {
      const { data: { user }, error } = await admin.auth.getUser(token)
      if (!error && user) {
        const { data: profile } = await admin
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        return {
          user: profile || null,
          role: profile?.role || 'USER',
          userId: user.id
        }
      }
    }
  }

  // 2. Signed-in session cookie. The role always comes from the stored
  //    profile, never from the request.
  const sessionUserId = safeGetCookie(event, 'session_user_id')
  if (sessionUserId) {
    const profile = dbStore.profiles.get(sessionUserId)
    if (profile) {
      return {
        user: profile,
        role: profile.role,
        userId: profile.id
      }
    }
  }

  // 3. Dev-only impersonation (explicitly opted in, never in production).
  //    The selected profile's stored role is used; x-user-role is ignored.
  if (isDevImpersonationEnabled()) {
    const impersonatedUserId = safeGetHeader(event, 'x-user-id')
    const profile = impersonatedUserId ? dbStore.profiles.get(impersonatedUserId) : undefined
    if (profile) {
      return {
        user: profile,
        role: profile.role,
        userId: profile.id
      }
    }
  }

  return anonymousContext()
}
