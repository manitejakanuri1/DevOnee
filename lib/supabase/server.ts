import { createClient as createSupabaseClient } from '@supabase/supabase-js'

let supabaseAdminClient: ReturnType<typeof createSupabaseClient> | undefined

export function createAdminClient() {
    if (supabaseAdminClient) return supabaseAdminClient

    supabaseAdminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    )

    return supabaseAdminClient
}
