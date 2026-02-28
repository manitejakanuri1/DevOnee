"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Session, User } from '@supabase/supabase-js'

interface AuthState {
    session: Session | null
    user: User | null
    loading: boolean
    providerToken: string | null
}

export function useAuth(): AuthState {
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const supabase = createClient()

        // Get initial session
        supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
            setSession(data.session)
            setLoading(false)
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event: any, session: Session | null) => {
                setSession(session)
                setLoading(false)
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    return {
        session,
        user: session?.user ?? null,
        loading,
        providerToken: session?.provider_token ?? null,
    }
}
