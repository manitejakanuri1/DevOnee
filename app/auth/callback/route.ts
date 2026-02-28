import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') || '/dashboard'

    if (code) {
        const cookieStore = cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    },
                },
            }
        )

        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error && data.session) {
            // Store the GitHub provider token in profiles for later API use
            const providerToken = data.session.provider_token
            const user = data.session.user

            if (providerToken && user) {
                try {
                    const admin = createAdminClient()
                    await admin
                        .from('profiles')
                        .upsert({
                            user_id: user.id,
                            github_token: providerToken,
                            name: user.user_metadata?.full_name || user.user_metadata?.name || null,
                            email: user.email,
                            avatar_url: user.user_metadata?.avatar_url || null,
                            updated_at: new Date().toISOString(),
                        }, { onConflict: 'user_id' })
                } catch (e) {
                    console.error('Failed to store profile:', e)
                }
            }
        }
    }

    return NextResponse.redirect(new URL(next, req.url))
}
