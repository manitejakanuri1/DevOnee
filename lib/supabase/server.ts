import { createClient as createSupabaseClient } from '@supabase/supabase-js'

let supabaseAdminClient: any

export function createAdminClient() {
    if (supabaseAdminClient) return supabaseAdminClient

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
        throw new Error('Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)')
    }

    supabaseAdminClient = createSupabaseClient(url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })

    return supabaseAdminClient
}
