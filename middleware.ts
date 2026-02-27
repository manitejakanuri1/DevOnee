import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const GUEST_COOKIE_NAME = 'devone_guest_id'

export function middleware(request: NextRequest) {
    const response = NextResponse.next()

    // Persist guest ID cookie if not already set.
    // This ensures every visitor (even unauthenticated) gets a stable identifier
    // so usage limits, saved prompts, and onboarding plans are scoped per-guest.
    if (!request.cookies.get(GUEST_COOKIE_NAME)) {
        const guestId = crypto.randomUUID()
        response.cookies.set(GUEST_COOKIE_NAME, guestId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 365, // 1 year
            path: '/',
        })
    }

    return response
}

export const config = {
    // Run on all routes except static assets
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
    ],
}
