import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";

const GUEST_COOKIE_NAME = 'devone_guest_id';

export interface UserIdentity {
    userId: string;           // profile_id (auth) or guest_id (guest)
    isGuest: boolean;
    profileId: string | null; // non-null only for authenticated users
    guestId: string | null;   // non-null only for guests
}

/**
 * Get a stable user identity from NextAuth session or guest cookie.
 * The middleware.ts ensures every visitor gets a persistent guest cookie,
 * so this should always return a stable identifier.
 */
export async function getUserIdentity(): Promise<UserIdentity> {
    const session = await getServerSession(authOptions);

    if (session?.user?.id) {
        return {
            userId: session.user.id,
            isGuest: false,
            profileId: session.user.id,
            guestId: null,
        };
    }

    // Fall back to guest cookie (set by middleware.ts)
    const cookieStore = cookies();
    const guestId = cookieStore.get(GUEST_COOKIE_NAME)?.value;

    if (guestId) {
        return {
            userId: guestId,
            isGuest: true,
            profileId: null,
            guestId,
        };
    }

    // Fallback — should not happen if middleware is working
    const fallbackId = crypto.randomUUID();
    return {
        userId: fallbackId,
        isGuest: true,
        profileId: null,
        guestId: fallbackId,
    };
}

/**
 * Require an authenticated (non-guest) session.
 * Returns null if the user is not signed in.
 */
export async function requireAuth(): Promise<{ session: any; userId: string; accessToken: string | null } | null> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;
    return {
        session,
        userId: session.user.id,
        accessToken: (session as any).accessToken || null,
    };
}
