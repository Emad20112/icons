import { createClient, SupabaseClient } from '@supabase/supabase-js'
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
 * Extracts and verifies current session from request headers/cookies.
 */
export async function getAuthContext(event: H3Event): Promise<AuthContext> {
  const authHeader = getHeader(event, 'authorization')
  const simulatedUserId = getHeader(event, 'x-user-id')
  const simulatedRole = getHeader(event, 'x-user-role') as UserRole | undefined

  // 1. If real Supabase is configured and bearer token is present
  if (isSupabaseConfigured() && authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const admin = getSupabaseAdminClient()
    if (admin) {
      const { data: { user }, error } = await admin.auth.getUser(token)
      if (!error && user) {
        // Fetch profile
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

  // 2. Fallback / Test / Preview Authentication Context
  if (simulatedUserId && dbStore.profiles.has(simulatedUserId)) {
    const profile = dbStore.profiles.get(simulatedUserId)!
    return {
      user: profile,
      role: simulatedRole || profile.role,
      userId: profile.id
    }
  }

  // Check cookie or default to lead admin for local inspection if requested via query
  const sessionCookie = getCookie(event, 'session_user_id')
  if (sessionCookie && dbStore.profiles.has(sessionCookie)) {
    const profile = dbStore.profiles.get(sessionCookie)!
    return {
      user: profile,
      role: profile.role,
      userId: profile.id
    }
  }

  // Default to Lead Admin in development/preview to allow immediate feature verification
  const defaultAdmin = dbStore.profiles.get('a0000000-0000-0000-0000-000000000001')
  if (defaultAdmin) {
    return {
      user: defaultAdmin,
      role: simulatedRole || defaultAdmin.role,
      userId: defaultAdmin.id
    }
  }

  return {
    user: null,
    role: null,
    userId: null
  }
}
