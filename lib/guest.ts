import { cookies } from 'next/headers'
import crypto from 'crypto'

const GUEST_COOKIE_NAME = 'devone_guest_id'

export function getGuestId(): string {
    const cookieStore = cookies()
    const existingId = cookieStore.get(GUEST_COOKIE_NAME)?.value

    if (existingId) {
        return existingId
    }

    // Generate a new guest ID using UUID v4
    const newGuestId = crypto.randomUUID()
    return newGuestId
}

export function setGuestIdCookie(id: string) {
    const cookieStore = cookies()
    cookieStore.set(GUEST_COOKIE_NAME, id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: '/',
    })
}

// How to use in API Routes:
// import { getGuestId, setGuestIdCookie } from '@/lib/guest'
// 
// export async function GET(req: Request) {
//   const guestId = getGuestId()
//   // If it's a new guest, you can strictly set the cookie, although this is usually better done in middleware
//   // For Edge/Next.js App Router handlers:
//   setGuestIdCookie(guestId)
//   return Response.json({ guestId })
// }
