"use client"

import { signIn, signOut, useSession } from "next-auth/react"

export function NavbarAuthButton() {
    const { data: session, status } = useSession()

    if (status === "loading") {
        return <div className="text-sm font-medium text-slate-500 animate-pulse">Loading...</div>
    }

    if (session) {
        return (
            <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-300">
                    {session.user?.name || session.user?.email}
                </span>
                <button
                    onClick={() => signOut()}
                    className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                    Sign Out
                </button>
            </div>
        )
    }

    return (
        <button
            onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
        >
            Sign In with GitHub
        </button>
    )
}
