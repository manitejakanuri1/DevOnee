"use client"

import { useAuth } from "@/lib/hooks/use-auth"
import { signInWithGitHub, signOutUser } from "@/lib/auth"

export function NavbarAuthButton() {
    const { user, loading } = useAuth()

    if (loading) {
        return <div className="text-sm font-medium text-slate-500 animate-pulse">Loading...</div>
    }

    if (user) {
        return (
            <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-300">
                    {user.user_metadata?.full_name || user.user_metadata?.name || user.email}
                </span>
                <button
                    onClick={() => signOutUser().then(() => window.location.reload())}
                    className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                    Sign Out
                </button>
            </div>
        )
    }

    return (
        <button
            onClick={() => signInWithGitHub()}
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
        >
            Sign In with GitHub
        </button>
    )
}
