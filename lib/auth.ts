import { createClient } from "@/lib/supabase/client"

/**
 * Sign in with GitHub via Supabase Auth.
 * Call from client components — redirects to GitHub OAuth.
 */
export async function signInWithGitHub(redirectTo?: string) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
            scopes: 'read:user user:email repo',
            redirectTo: redirectTo || `${window.location.origin}/auth/callback`,
        },
    })
    if (error) throw error
    return data
}

/**
 * Sign out via Supabase Auth.
 */
export async function signOutUser() {
    const supabase = createClient()
    await supabase.auth.signOut()
}

/**
 * Get the current session from Supabase Auth (client-side).
 */
export async function getSession() {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session
}

/**
 * Get the GitHub provider token from the current session.
 */
export async function getGitHubToken(): Promise<string | null> {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session?.provider_token || null
}
